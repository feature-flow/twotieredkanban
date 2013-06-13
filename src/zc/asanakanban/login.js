
dojo.ready(
    function () {
        var signinLink = document.getElementById('signin');
        if (signinLink) {
            signinLink.onclick = function() { navigator.id.request(); };
        }

        navigator.id.watch(
            {
                loggedInUser: %(email)s,
                onlogin: function(assertion) {
                    dojo.xhr.post(
                        {
                            url: "/login",
                            content: { assertion: assertion },
                            load: function () {
                                window.location = "%(url)s";
                            },
                            error: function(err) {
                                navigator.id.logout();
                                alert("Login failure: " + err.response.data);
                            }
                        });
                },
                onlogout: function() {
                    dojo.xhr.post(
                        {
                            url: '/logout', // This is a URL on your website.
                            load: function () {
                                window.location = "/login.html";
                            },
                            error: function(err) {
                                alert("Logout failure: " + err); }
                        });
                }
            });
    });
