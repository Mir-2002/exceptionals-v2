from utils.auth import hash_password, verify_password


def test_hash_and_verify_password_round_trip():
    pw = "S3cret!"
    h = hash_password(pw)
    assert h != pw
    assert verify_password(pw, h) is True
    assert verify_password("wrong", h) is False
