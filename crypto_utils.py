from Crypto.Cipher import AES
import base64
import os
import json

# 32 bytes key for AES256
KEY = os.environ.get('AES_KEY', 'thisisaverysecretkey1234567890ab').encode('utf-8')
NONCE = os.environ.get('AES_NONCE', 'thisisgcmnonce!').encode('utf-8')  # 12 bytes for GCM

def encrypt_data(data_bytes: bytes) -> str:
    cipher = AES.new(KEY, AES.MODE_GCM, nonce=NONCE)
    ct_bytes, tag = cipher.encrypt_and_digest(data_bytes)
    payload = {
        'nonce': base64.b64encode(NONCE).decode('utf-8'),
        'tag': base64.b64encode(tag).decode('utf-8'),
        'ciphertext': base64.b64encode(ct_bytes).decode('utf-8')
    }
    return base64.b64encode(json.dumps(payload).encode('utf-8')).decode('utf-8')

def decrypt_data(enc_data: str) -> str:
    payload = json.loads(base64.b64decode(enc_data).decode('utf-8'))
    nonce = base64.b64decode(payload['nonce'])
    tag = base64.b64decode(payload['tag'])
    ct = base64.b64decode(payload['ciphertext'])
    cipher = AES.new(KEY, AES.MODE_GCM, nonce=nonce)
    pt = cipher.decrypt_and_verify(ct, tag)
    return pt.decode('utf-8')
