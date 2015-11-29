import bobo
import hashlib
import json
import jwt
import requests
import webob

from .apibase import set_cookie, email_hash

@bobo.scan_class
class Persona:

  def __init__(self, base):
      self.site = base.site
      self.root = base.root

  @bobo.post('/login')
  def persona_login(self, assertion):
      # Send the assertion to Mozilla's verifier service.
      data = {'assertion': assertion, 'audience': audience}
      resp = requests.post(
          'https://verifier.login.persona.org/verify', data=data, verify=True)

      # Did the verifier respond?
      if resp.ok:
          # Parse the response
          verification_data = json.loads(resp.content.decode('utf-8'))

          # Check if the assertion was valid
          if verification_data['status'] == 'okay':
              email = verification_data['email']
              response = webob.Response(
                  json.dumps(dict(
                      email = email,
                      email_hash = email_hash(email),
                      is_admin = email in self.site.admins,
                      )),
                  content_type="application/json",
                  )
              set_cookie(response, self.root, email)
              return response
          else:
              raise bobo.BoboException('403', verification_data['reason'])
      else:
          # Oops, something failed. Abort.
          raise ValueError("wtf")

def config(options):
    from .apibase import Base
    Base.persona = bobo.subroute('/kb-persona')(lambda self, r: Persona(self))

    global audience
    audience = options['audience']
