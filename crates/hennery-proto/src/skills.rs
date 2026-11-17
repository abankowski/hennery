//! Agent Skills rules shared by the collector and the host: the skill-name
//! rule and a minimal `SKILL.md` frontmatter reader.

/// Longest allowed skill name, in characters.
pub const MAX_NAME: usize = 64;
/// Longest allowed skill description, in characters.
pub const MAX_DESCRIPTION: usize = 1024;

/// Whether `name` is a valid skill name: 1-64 characters from `a-z`, `0-9`
/// and `-`, with no leading, trailing or doubled hyphen.
pub fn valid_name(name: &str) -> bool {
    !name.is_empty()
        && name.len() <= MAX_NAME
        && !name.starts_with('-')
        && !name.ends_with('-')
        && !name.contains("--")
        && name
            .bytes()
            .all(|b| b.is_ascii_lowercase() || b.is_ascii_digit() || b == b'-')
}

/// The two frontmatter fields hennery needs from a `SKILL.md`.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Frontmatter {
    /// Skill name; satisfies [`valid_name`].
    pub name: String,
    /// Skill description, 1-1024 characters.
    pub description: String,
}

/// Why a `SKILL.md` frontmatter was rejected.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum FrontmatterError {
    /// The file does not start with a `---` line.
    Missing,
    /// The opening `---` has no closing `---` line.
    Unterminated,
    /// No non-empty `name` key.
    NoName,
    /// No non-empty `description` key.
    NoDescription,
    /// `description` is longer than [`MAX_DESCRIPTION`].
    DescriptionTooLong,
    /// `name` fails [`valid_name`].
    BadName,
}

/// Reads `name` and `description` from the first `---` block of a `SKILL.md`.
///
/// This is not a YAML parser: it reads line-based `key: value` pairs, strips
/// one pair of surrounding `"` or `'` quotes and ignores other keys. A
/// multi-line value ends at its first line.
pub fn frontmatter(skill_md: &str) -> Result<Frontmatter, FrontmatterError> {
    let mut lines = skill_md.lines();
    if lines.next().map(str::trim_end) != Some("---") {
        return Err(FrontmatterError::Missing);
    }
    let (mut name, mut description, mut closed) = (None, None, false);
    for line in lines {
        if line.trim_end() == "---" {
            closed = true;
            break;
        }
        let Some((key, value)) = line.split_once(':') else {
            continue;
        };
        let value = unquote(value.trim());
        match key.trim() {
            "name" => name = Some(value),
            "description" => description = Some(value),
            _ => {}
        }
    }
    if !closed {
        return Err(FrontmatterError::Unterminated);
    }
    let name = name.filter(|v| !v.is_empty()).ok_or(FrontmatterError::NoName)?;
    let description = description
        .filter(|v| !v.is_empty())
        .ok_or(FrontmatterError::NoDescription)?;
    if !valid_name(name) {
        return Err(FrontmatterError::BadName);
    }
    if description.chars().count() > MAX_DESCRIPTION {
        return Err(FrontmatterError::DescriptionTooLong);
    }
    Ok(Frontmatter {
        name: name.to_owned(),
        description: description.to_owned(),
    })
}

fn unquote(value: &str) -> &str {
    for q in ['"', '\''] {
        if let Some(inner) = value.strip_prefix(q).and_then(|v| v.strip_suffix(q)) {
            return inner;
        }
    }
    value
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn names_follow_the_agent_skills_rules() {
        for ok in ["a", "pdf-processing", "a1-b2", &"x".repeat(64)] {
            assert!(valid_name(ok), "{ok}");
        }
        for bad in ["", "-a", "a-", "a--b", "PDF", "a_b", "a b", &"x".repeat(65), "ż"] {
            assert!(!valid_name(bad), "{bad}");
        }
    }

    #[test]
    fn frontmatter_reads_name_and_description() {
        let fm =
            frontmatter("---\nname: pdf\ndescription: \"Reads PDFs. Use when asked.\"\nversion: 0.4.0\n---\n# PDF\n")
                .unwrap();
        assert_eq!(fm.name, "pdf");
        assert_eq!(fm.description, "Reads PDFs. Use when asked.");
    }

    #[test]
    fn frontmatter_must_open_the_file() {
        assert!(matches!(
            frontmatter("# no\n---\nname: a\n---"),
            Err(FrontmatterError::Missing)
        ));
    }

    #[test]
    fn frontmatter_needs_both_fields() {
        assert!(matches!(
            frontmatter("---\nname: a\n---\n"),
            Err(FrontmatterError::NoDescription)
        ));
        assert!(matches!(
            frontmatter("---\ndescription: d\n---\n"),
            Err(FrontmatterError::NoName)
        ));
        assert!(matches!(
            frontmatter("---\nname: A\ndescription: d\n---\n"),
            Err(FrontmatterError::BadName)
        ));
        let long = format!("---\nname: a\ndescription: {}\n---\n", "d".repeat(1025));
        assert!(matches!(frontmatter(&long), Err(FrontmatterError::DescriptionTooLong)));
    }

    #[test]
    fn frontmatter_must_close() {
        assert!(matches!(
            frontmatter("---\nname: a\ndescription: d\n"),
            Err(FrontmatterError::Unterminated)
        ));
    }
}
