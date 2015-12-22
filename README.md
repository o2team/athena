# Athena Site

[http://aotu.io/athena](http://aotu.io/athena).

## Begin

```bash
# clone the project
git clone git@github.com:o2team/athena.git

# checkout the gh-pages branch
git checkout gh-pages

# install the dependencies
npm i --registry=http://registry.npm.taobao.org --disturl=http://npm.taobao.org/mirrors/node
```

## preview

first , run the gulp task.

```bash
gulp
```

then open your brower location at `index.html` of the root.

## commit

```bash
git add .
git commit -m "your commit description"
git push origin gh-pages
```

