"""Plugin interfaces
"""

try:
    from zope.interface import Interface
except ImportError:
    Interface = object

class IAuthentication(Interface):

    def user(request):
        """Return authenticated user data for the request as a mapping.

        The user should be a dict with id, name, email, ``admin``
        flag, and nick.
        """

    def login(request):
        """Present a login interface.
        """

    def subroute(base):
        """Return a bobo subroute using a base API.
        """
