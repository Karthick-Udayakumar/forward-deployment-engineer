import requests

URL = "https://jsonplaceholder.typicode.com/posts/1"

response = requests.get(URL)

# Returns Dictionary
print(response.json())

print(response.status_code)

data = response.json()

print(data['title'])