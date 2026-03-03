import hashlib

password = "test"
salt = "107e8448bd10d682dfebca5ef1531197" # from 'test' user in DB
stored_hash = "046d9e51139a9ea75f18a5ffddcc1b865eeb777cbc4ccd01f77cbc4ccd01f77cbd1491954886"

# Try different combinations
h1 = hashlib.sha256((password + salt).encode()).hexdigest()
h2 = hashlib.sha256((salt + password).encode()).hexdigest()

print(f"h1 (pw+salt): {h1}")
print(f"h2 (salt+pw): {h2}")
print(f"Target:      {stored_hash}")
