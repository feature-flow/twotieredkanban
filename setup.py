import setuptools

entry_points = """
[zc.buildout]
default = akbrecipe:Recipe
"""

setuptools.setup(
    name="akb",
    py_modules=["akbrecipe"],
    install_requires=[
        'zc.zk [static]',
        'zc.recipe.deployment',
        'zc.recipe.rhrc',
        'zc.zdaemonrecipe',
        'zdaemon',
        ],
    entry_points = entry_points,
    )
