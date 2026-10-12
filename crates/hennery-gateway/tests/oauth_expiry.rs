//! F5: vendor lifetimes cannot overflow persistence or the refresh deadline.
use hennery_gateway::{oauth, refresh};
#[test]
fn expiry_is_capped_and_saturates() {
    const YEAR: i64 = 365 * 24 * 60 * 60;
    assert_eq!(oauth::expires_at(1000, Some(i64::MAX)), Some(1000 + YEAR - 60));
    assert_eq!(oauth::expires_at(i64::MAX - 1, Some(3600)), Some(i64::MAX));
    assert_eq!(oauth::expires_at(i64::MIN, Some(i64::MIN)), Some(i64::MIN));
    assert_eq!(oauth::expires_at(1000, Some(0)), Some(1000));
    assert_eq!(oauth::expires_at(1000, None), None);
}
#[test]
fn refresh_due_handles_extreme_stamps() {
    assert!(!refresh::due(Some(i64::MAX), i64::MIN));
    assert!(refresh::due(Some(i64::MIN), i64::MAX));
    assert!(refresh::due(Some(i64::MAX), i64::MAX - 300));
    assert!(!refresh::due(Some(i64::MAX), i64::MAX - 301));
    assert!(!refresh::due(None, i64::MAX));
}
