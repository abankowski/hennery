//! Bounds and redaction for decoded, untrusted startup data. Source validation
//! belongs to the collector, under its owner/scope transaction.
use anyhow::Result;
use hennery_proto::plugin::{PluginContext, Provenance};

pub fn sanitize(input: PluginContext) -> Result<PluginContext> {
    // Decode strictly before this function; Value is safe only after duplicate
    // and unknown keys have already been refused by the typed decoder.
    let mut value = serde_json::to_value(input)?;
    let redacted = crate::redact::value(&mut value);
    let mut context: PluginContext = serde_json::from_value(value)?;
    context.truncated |= redacted;
    if context.generated_at.len() > 128 {
        context.generated_at.clear();
        context.truncated = true;
    }
    if context.entries.len() > 32 {
        context.entries.truncate(32);
        context.truncated = true;
    }
    for entry in &mut context.entries {
        if entry.provenance.is_empty() {
            entry.provenance.push(Provenance::Unverified {});
        }
        if entry.text.len() > 4096 {
            let mut end = 4096;
            while !entry.text.is_char_boundary(end) {
                end -= 1;
            }
            entry.text.truncate(end);
            context.truncated = true;
        }
    }
    while serde_json::to_vec(&context)?.len() > 8192 {
        context.entries.pop();
        context.truncated = true;
    }
    Ok(context)
}
