# serve-npm-tarballs

A teensy little utility to serve NPM tarballs right before they're published.

If you want to integration tests your (set of) NPM tarballs, you might
run into behaviors of `npm install` that are slightly different depending
on whether you're installing from a registry or running `npm install <file>.tgz`.

This tool helps make testing the same as for your users.

## Usage
