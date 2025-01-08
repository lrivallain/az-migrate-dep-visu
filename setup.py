from setuptools import setup, find_packages

setup(
    name='az-migrate-dep-visu',
    version='0.1.2',
    packages=find_packages(include=['az_migrate_dep_visu', 'az_migrate_dep_visu.*', 'tests']),
    include_package_data=True,
    install_requires=[
        'Flask',
        'Jinja2',
        'Werkzeug',
        'networkx[default]',
        'pyvis'
    ],
    entry_points={
        'console_scripts': [
            'az-mdv=az_migrate_dep_visu.app:app.run'
        ]
    },
    author='Ludovic Rivallain',
    author_email='ludovic.rivallain+pypi@gmail.com',
    description='A web application to visualize network flows from Azure Migrate Dependency analysis CSV files.',
    long_description=open('README.md').read(),
    long_description_content_type='text/markdown',
    url='https://github.com/lrivallain/az-migrate-dep-visu',
    classifiers=[
        'Programming Language :: Python :: 3',
        'License :: OSI Approved :: MIT License',
        'Operating System :: OS Independent',
    ],
    python_requires='>=3.6',
)
