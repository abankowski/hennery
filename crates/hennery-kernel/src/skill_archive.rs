//! Inspection of an uploaded skill archive (skills spec §5): a tar.gz read
//! once in memory, never written to disk, with nothing taken on trust from
//! it. Only regular files and directories, only plain relative paths, sizes
//! and counts bounded; the root `SKILL.md` is read and its frontmatter
//! parsed.

use crate::secret::sha256_hex;
use base64::Engine;
use hennery_proto::skills::{Frontmatter, FrontmatterError, frontmatter};
use std::io::Read;

/// The largest compressed archive.
pub const MAX_COMPRESSED: usize = 8 << 20;
/// The most bytes of file content in one archive.
pub const MAX_UNCOMPRESSED: u64 = 8 << 20;
/// The most entries (files and directories) in one archive.
pub const MAX_ENTRIES: usize = 512;
/// The largest single file (and so the largest stored `SKILL.md`).
pub const MAX_FILE: u64 = 2 << 20;

/// Room, beyond the content limit, for headers and padding when bounding
/// the decompressed stream.
const STREAM_SLACK: u64 = 4 << 20;

/// What an accepted archive says about itself.
#[derive(Debug)]
pub struct Inspected {
    pub frontmatter: Frontmatter,
    pub skill_md: String,
    /// Lowercase hex SHA-256 of the compressed bytes.
    pub content_hash: String,
}

/// Why an upload was refused.
#[derive(Debug, PartialEq, Eq)]
pub enum Refusal {
    NotBase64,
    TooLarge,
    NotTarGz,
    /// An entry that is not allowed, or too many entries.
    Entry(String),
    NoSkillMd,
    Frontmatter(FrontmatterError),
}

/// The upload `data` (standard base64) decoded and inspected; returns the
/// archive bytes as well.
pub fn from_upload(data: &str) -> Result<(Vec<u8>, Inspected), Refusal> {
    // Checked from the length before anything is decoded.
    if data.len() > MAX_COMPRESSED.div_ceil(3) * 4 {
        return Err(Refusal::TooLarge);
    }
    let bytes = base64::engine::general_purpose::STANDARD
        .decode(data)
        .map_err(|_| Refusal::NotBase64)?;
    let inspected = inspect(&bytes)?;
    Ok((bytes, inspected))
}

/// Walk `tgz` once and check every entry against the limits.
pub fn inspect(tgz: &[u8]) -> Result<Inspected, Refusal> {
    if tgz.len() > MAX_COMPRESSED {
        return Err(Refusal::TooLarge);
    }
    let decoder = flate2::read::GzDecoder::new(tgz).take(MAX_UNCOMPRESSED + STREAM_SLACK);
    let mut archive = tar::Archive::new(decoder);
    let mut count = 0usize;
    let mut total = 0u64;
    let mut skill_md: Option<String> = None;
    for entry in archive.entries().map_err(|_| Refusal::NotTarGz)? {
        let mut entry = entry.map_err(|_| Refusal::NotTarGz)?;
        let kind = entry.header().entry_type();
        // A pax global header carries only metadata.
        if kind.is_pax_global_extensions() {
            continue;
        }
        count += 1;
        if count > MAX_ENTRIES {
            return Err(Refusal::Entry(format!("more than {MAX_ENTRIES} entries")));
        }
        let raw = entry.path_bytes().into_owned();
        let name = std::str::from_utf8(&raw)
            .map_err(|_| Refusal::Entry("an entry name is not UTF-8".into()))?
            .to_owned();
        if !kind.is_dir() && !kind.is_file() {
            return Err(Refusal::Entry(format!(
                "{name:?} is not a regular file or a directory; links and special files are refused"
            )));
        }
        let relative = plain_path(&name)?;
        if kind.is_dir() {
            continue;
        }
        let size = entry.header().size().map_err(|_| Refusal::NotTarGz)?;
        if size > MAX_FILE {
            return Err(Refusal::TooLarge);
        }
        total += size;
        if total > MAX_UNCOMPRESSED {
            return Err(Refusal::TooLarge);
        }
        if relative == "SKILL.md" {
            if skill_md.is_some() {
                return Err(Refusal::Entry("SKILL.md appears twice".into()));
            }
            let mut text = String::new();
            entry
                .read_to_string(&mut text)
                .map_err(|_| Refusal::Entry("SKILL.md is not UTF-8 text".into()))?;
            skill_md = Some(text);
        }
    }
    let skill_md = skill_md.ok_or(Refusal::NoSkillMd)?;
    let frontmatter = frontmatter(&skill_md).map_err(Refusal::Frontmatter)?;
    Ok(Inspected {
        frontmatter,
        skill_md,
        content_hash: sha256_hex(tgz),
    })
}

/// `name` with one optional leading `./` removed, when it is a plain
/// relative path: not absolute, no `..`, no further `./` at the start.
/// The archive root itself yields the empty string.
fn plain_path(name: &str) -> Result<&str, Refusal> {
    let bad = |why: &str| Refusal::Entry(format!("{name:?}: {why}"));
    let relative = name.strip_prefix("./").unwrap_or(name);
    if relative.starts_with('/') {
        return Err(bad("an absolute path"));
    }
    if relative.starts_with("./") {
        return Err(bad("a path that starts with ./ twice"));
    }
    if relative.split('/').any(|part| part == "..") {
        return Err(bad("a path with .."));
    }
    Ok(relative.trim_end_matches('/'))
}

#[cfg(test)]
mod tests {
    use super::*;
    use flate2::Compression;
    use flate2::write::GzEncoder;

    fn finish(builder: tar::Builder<GzEncoder<Vec<u8>>>) -> Vec<u8> {
        builder.into_inner().unwrap().finish().unwrap()
    }

    fn tgz(entries: &[(&str, &[u8])]) -> Vec<u8> {
        let mut builder = tar::Builder::new(GzEncoder::new(Vec::new(), Compression::fast()));
        for (name, data) in entries {
            let mut header = tar::Header::new_gnu();
            if name.ends_with('/') {
                header.set_entry_type(tar::EntryType::Directory);
                header.set_mode(0o755);
            } else {
                header.set_entry_type(tar::EntryType::Regular);
                header.set_mode(0o644);
            }
            header.set_size(data.len() as u64);
            // `set_path` refuses `..` and absolute paths, so write the name raw.
            let bytes = name.as_bytes();
            header.as_old_mut().name[..bytes.len()].copy_from_slice(bytes);
            header.set_cksum();
            builder.append(&header, *data).unwrap();
        }
        finish(builder)
    }

    const SKILL: &[u8] = b"---\nname: a\ndescription: d\n---";

    #[test]
    fn a_valid_skill_is_inspected() {
        let bytes = tgz(&[
            ("SKILL.md", b"---\nname: pdf\ndescription: d\n---\n# PDF"),
            ("scripts/", b""),
            ("scripts/x.py", b"print()"),
        ]);
        let got = inspect(&bytes).unwrap();
        assert_eq!(got.frontmatter.name, "pdf");
        assert!(got.skill_md.starts_with("---"));
        assert_eq!(got.content_hash.len(), 64);
    }

    #[test]
    fn a_path_outside_the_root_is_refused() {
        for bad in ["../x", "/etc/x", "a/../../x", "././x"] {
            let bytes = tgz(&[("SKILL.md", SKILL), (bad, b"x")]);
            assert!(matches!(inspect(&bytes), Err(Refusal::Entry(_))), "{bad}");
        }
    }

    #[test]
    fn links_and_special_entries_are_refused() {
        for kind in [tar::EntryType::Symlink, tar::EntryType::Link, tar::EntryType::Fifo] {
            let mut builder = tar::Builder::new(GzEncoder::new(Vec::new(), Compression::fast()));
            let mut header = tar::Header::new_gnu();
            header.set_entry_type(kind);
            header.set_size(0);
            header.set_path("link").unwrap();
            header.set_link_name("/etc/passwd").unwrap();
            header.set_cksum();
            builder.append(&header, std::io::empty()).unwrap();
            let mut file = tar::Header::new_gnu();
            file.set_size(SKILL.len() as u64);
            file.set_path("SKILL.md").unwrap();
            file.set_cksum();
            builder.append(&file, SKILL).unwrap();
            assert!(matches!(inspect(&finish(builder)), Err(Refusal::Entry(_))), "{kind:?}");
        }
    }

    #[test]
    fn limits_are_enforced() {
        let names: Vec<String> = (0..513).map(|i| format!("f{i}")).collect();
        let mut many: Vec<(&str, &[u8])> = vec![("SKILL.md", SKILL)];
        many.extend(names.iter().map(|n| (n.as_str(), &b""[..])));
        assert!(matches!(inspect(&tgz(&many)), Err(Refusal::Entry(_))));

        let big = vec![0u8; (MAX_FILE + 1) as usize];
        let bytes = tgz(&[("SKILL.md", SKILL), ("big", &big)]);
        assert_eq!(inspect(&bytes).unwrap_err(), Refusal::TooLarge);

        let two_mib = vec![0u8; MAX_FILE as usize];
        let bytes = tgz(&[
            ("SKILL.md", SKILL),
            ("a", &two_mib),
            ("b", &two_mib),
            ("c", &two_mib),
            ("d", &two_mib),
            ("e", &two_mib),
        ]);
        assert_eq!(inspect(&bytes).unwrap_err(), Refusal::TooLarge);
    }

    #[test]
    fn skill_md_must_be_at_the_root() {
        let bytes = tgz(&[("sub/SKILL.md", SKILL)]);
        assert_eq!(inspect(&bytes).unwrap_err(), Refusal::NoSkillMd);
    }

    #[test]
    fn from_upload_refuses_oversized_and_bad_base64() {
        assert_eq!(from_upload("!!!").unwrap_err(), Refusal::NotBase64);
        let long = "A".repeat(MAX_COMPRESSED.div_ceil(3) * 4 + 1);
        assert_eq!(from_upload(&long).unwrap_err(), Refusal::TooLarge);
        let bytes = tgz(&[("SKILL.md", SKILL)]);
        let data = base64::engine::general_purpose::STANDARD.encode(&bytes);
        let (back, inspected) = from_upload(&data).unwrap();
        assert_eq!(back, bytes);
        assert_eq!(inspected.frontmatter.name, "a");
        assert_eq!(from_upload("AAAA").unwrap_err(), Refusal::NotTarGz);
    }
}
