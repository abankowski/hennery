# Authentic upstream attestation fixture

Exact upstream files from `cli/cli` commit
`b62671151b7c98852b7023dd672f5092d1c9dab0`, directory
`pkg/cmd/attestation/test/data`, fetched read-only. The test pins each SHA-256.
The payload is sigstore-js 2.1.0; its genuine certificate identifies
`sigstore/sigstore-js`, `release.yml@refs/heads/main`, source/signer commit
`26d16513386ffaa790b1c32f927544f1322e4194`, run `6014488666`, attempt `1`.
The public-good trusted root is the matching upstream fixture. Its use is
confined to the offline test; production verification uses its normal root.

Pinned `gh 2.101.0` must verify the original payload and reject changed bytes.
Its flattened certificate JSON must remain stable; a CLI bump requires explicit
requalification. Production Hennery policy must reject this upstream identity.
Tests substituting Hennery fields are structural tests, never crypto evidence.
No real Hennery attestation was created. Under the latest operator decision
(2026-10-16), all channels may be enabled for the first release without waiting
for this fixture. Preserve and verify that release's genuine Hennery tagged
attestation, payload and provenance as follow-up evidence.

Generated with Claude AI — please review before distribution.
