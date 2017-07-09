import jwt
import jwt.exceptions
import time

TOKEN='auth_token'

def token(secret, **data):
    return jwt.encode(data, secret, algorithm='HS256').decode('utf-8')

def decode(token, secret, timeout=None):
    try:
        data = jwt.decode(token, secret, algorithms=['HS256'])

        if timeout and data['time'] + timeout < time.time():
            return None

        return data
    except jwt.exceptions.DecodeError:
        return None

def save(jar, secret, secure=False, **data):
    jar.set_cookie(TOKEN, token(secret, **data), secure=secure, httponly=True)

def load(jar, secret):
    token = jar.cookies.get(TOKEN)
    data = token and decode(token, secret)
    return data
