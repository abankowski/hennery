//! Portable, consistent namespace content. No archive is written to disk.
use crate::management::Snapshot;
use hennery_kernel::secret::sha256_hex;
use serde_json::json;
use std::io;
fn frame(path: &str, bytes: &[u8]) -> io::Result<Vec<u8>> {
    let mut header = tar::Header::new_ustar();
    header.set_path(path)?;
    header.set_entry_type(tar::EntryType::Regular);
    header.set_mode(0o600);
    header.set_size(bytes.len() as u64);
    header.set_cksum();
    let mut output = Vec::with_capacity(512 + bytes.len().div_ceil(512) * 512);
    output.extend_from_slice(header.as_bytes());
    output.extend_from_slice(bytes);
    output.resize(512 + bytes.len().div_ceil(512) * 512, 0);
    Ok(output)
}
fn filename(kind: &str, id: &str) -> String {
    let directory = match kind {
        "note" => "notes",
        "source" => "sources",
        _ => "memories",
    };
    format!("{directory}/{id}.md")
}
pub fn files(snapshot: Snapshot) -> impl Iterator<Item = io::Result<Vec<u8>>> {
    let manifest = (|| {
        let entries = snapshot
            .entries
            .iter()
            .map(|e| {
                let mut metadata = serde_json::to_value(e).expect("entry");
                metadata.as_object_mut().expect("object").remove("body");
                json!({"file":filename(&e.kind,&e.id),"sha256":sha256_hex(e.body.as_bytes()),"metadata":metadata})
            })
            .collect::<Vec<_>>();
        let manifest = serde_json::to_vec_pretty(
            &json!({"version":snapshot.version,"namespace":snapshot.namespace,"hat":snapshot.hat,"exported_at":snapshot.exported_at,"entries":entries,"limits":"Content only; credentials, jobs, external exports/backups and flash remanence excluded"}),
        )?;
        frame("manifest.json", &manifest)
    })();
    std::iter::once(manifest)
        .chain(
            snapshot
                .entries
                .into_iter()
                .map(|entry| frame(&filename(&entry.kind, &entry.id), entry.body.as_bytes())),
        )
        .chain(std::iter::once(Ok(vec![0; 1024])))
}
