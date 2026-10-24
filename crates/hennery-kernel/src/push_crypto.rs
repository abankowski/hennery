//! RFC 8291 key agreement over the maintained p256 stack; RFC 8188 record
//! encryption remains in ece-native. Each message uses a fresh ephemeral
//! key and salt. This module never handles the persistent VAPID signing key.

use anyhow::{Result, ensure};
use hkdf::Hkdf;
use p256::elliptic_curve::sec1::ToSec1Point;
use p256::{PublicKey, SecretKey};
use sha2::Sha256;
use zeroize::Zeroizing;

pub(crate) fn encrypt(plaintext: &[u8], recipient: &PublicKey, auth: &[u8; 16]) -> Result<Vec<u8>> {
    let sender = crate::push::fresh_secret();
    encrypt_with(plaintext, recipient, auth, &sender, crate::secret::random_bytes())
}

fn encrypt_with(
    plaintext: &[u8],
    recipient: &PublicKey,
    auth: &[u8; 16],
    sender: &SecretKey,
    salt: [u8; 16],
) -> Result<Vec<u8>> {
    ensure!(
        plaintext.len() <= crate::delivery::MAX_PLAINTEXT,
        "push payload exceeds one record"
    );
    let sender_public = sender.public_key().to_sec1_point(false);
    let recipient_public = recipient.to_sec1_point(false);
    let shared = sender.diffie_hellman(recipient);
    // RFC 8291 section 3.3: recipient before sender, both uncompressed.
    let mut info = Vec::with_capacity(144);
    info.extend_from_slice(b"WebPush: info\0");
    info.extend_from_slice(recipient_public.as_bytes());
    info.extend_from_slice(sender_public.as_bytes());
    let mut ikm = Zeroizing::new([0u8; 32]);
    Hkdf::<Sha256>::new(Some(auth), shared.raw_secret_bytes())
        .expand(&info, &mut ikm[..])
        .expect("32-byte RFC 8291 key material");
    // Section 4 requires one final record, strictly shorter than rs, and a
    // body at most 4096 bytes: 86 header + plaintext + delimiter + 16 tag.
    Ok(ece_native::encrypt(
        ikm.as_slice(),
        salt,
        sender_public.as_bytes(),
        std::iter::once(plaintext.to_vec()),
        4096,
    )?)
}

#[cfg(test)]
mod tests {
    use super::*;
    use base64::{Engine, engine::general_purpose::URL_SAFE_NO_PAD};

    fn components(secret: &SecretKey) -> ece::EcKeyComponents {
        ece::EcKeyComponents::new(
            secret.to_bytes().to_vec(),
            secret.public_key().to_sec1_point(false).as_bytes().to_vec(),
        )
    }

    #[test]
    fn the_complete_rfc_8291_example_matches_including_the_record_header() {
        // Public test vector: https://www.rfc-editor.org/rfc/rfc8291#section-5
        let decode = |text| URL_SAFE_NO_PAD.decode(text).unwrap();
        let recipient = SecretKey::from_slice(&decode("q1dXpw3UpT5VOmu_cf_v6ih07Aems3njxI-JWgLcM94")).unwrap();
        let sender = SecretKey::from_slice(&decode("yfWPiYE-n46HLnH0KqZOF1fJJU3MYrct3AELtAQ-oRw")).unwrap();
        let auth = decode("BTBZMqHH6r4Tts7J_aSIgg").try_into().unwrap();
        let salt = decode("DGv6ra1nlYgDCS1FRnbzlw").try_into().unwrap();
        let plaintext = b"When I grow up, I want to be a watermelon";
        let expected = decode(concat!(
            "DGv6ra1nlYgDCS1FRnbzlwAAEABBBP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27ml",
            "mlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A_yl95bQpu6cVPT",
            "pK4Mqgkf1CXztLVBSt2Ks3oZwbuwXPXLWyouBWLVWGNWQexSgSxsj_Qulcy4a-fN"
        ));
        let body = encrypt_with(plaintext, &recipient.public_key(), &auth, &sender, salt).unwrap();
        assert_eq!(body, expected);
        assert_eq!(ece::decrypt(&components(&recipient), &auth, &body).unwrap(), plaintext);
    }

    #[test]
    fn an_independent_receiver_reads_every_bucket_and_the_3993_byte_limit() {
        let recipient = SecretKey::from_slice(&[7; 32]).unwrap();
        let auth = [8; 16];
        for len in [1, 511, 512, 1024, 3967, 3992, 3993] {
            let plaintext = vec![b'x'; len];
            let body = encrypt(&plaintext, &recipient.public_key(), &auth).unwrap();
            assert_eq!(body.len(), len + 103);
            assert!(body.len() <= 4096);
            let rs = u32::from_be_bytes(body[16..20].try_into().unwrap()) as usize;
            assert!(rs > body.len() - 86, "the only record must be final");
            assert_eq!(body[20], 65);
            assert_eq!(body[21], 4);
            assert_eq!(ece::decrypt(&components(&recipient), &auth, &body).unwrap(), plaintext);
        }
        assert!(encrypt(&vec![b'x'; 3994], &recipient.public_key(), &auth).is_err());
    }

    #[test]
    fn wrong_keys_authentication_or_modified_ciphertext_are_refused() {
        let recipient = SecretKey::from_slice(&[7; 32]).unwrap();
        let other = SecretKey::from_slice(&[9; 32]).unwrap();
        let auth = [8; 16];
        let body = encrypt(b"private notification", &recipient.public_key(), &auth).unwrap();
        assert!(ece::decrypt(&components(&other), &auth, &body).is_err());
        assert!(ece::decrypt(&components(&recipient), &[9; 16], &body).is_err());
        for offset in [0, 25, body.len() - 1] {
            let mut changed = body.clone();
            changed[offset] ^= 1;
            assert!(ece::decrypt(&components(&recipient), &auth, &changed).is_err());
        }
    }

    #[test]
    fn every_message_has_a_new_sender_key_and_salt() {
        let recipient = SecretKey::from_slice(&[7; 32]).unwrap().public_key();
        let first = encrypt(b"same notification", &recipient, &[8; 16]).unwrap();
        let second = encrypt(b"same notification", &recipient, &[8; 16]).unwrap();
        assert_ne!(first[..16], second[..16]);
        assert_ne!(first[21..86], second[21..86]);
    }
}
