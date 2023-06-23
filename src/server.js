const express = require("express");

const { fetcher } = require('../fetcher.js');

const TRY_COUNT_LIMIT = 2;
const HTTP_OK = 200;
const BAD_REQUEST = 400;
const HTTP_ERROR = 500;
const PORT = 3000;

const app = express();

app.use(express.json());

app.post("/parse", async (req, res, next) => {
    try {
        const domainName = req.body.domainName;
        if (!domainName) {
            res.statusCode = BAD_REQUEST;
            res.send({message: 'Empty request'}); 
            res.end();
            return;
        }

        const visited = await process(domainName); 
        res.json(getGoodLinks(visited)); 
    } catch(err) { 
        console.log(err); 
        next(err.message);
    }
});

app.use((err, req, res, next) => {
    res.status(500)
    res.send({ error: err });
})

app.listen(PORT, () => console.log(`Server started on port ${PORT}...`));

// -----------------

async function process(domainName) { 
    const visited = {}; 
    const queue=[];

    queue.push(domainName);
    while (queue.length > 0) {
        const url = queue.shift();
        const getLinksResult = await getLinks(url, domainName);
        if (!visited[url]) {
            visited[url] = {tryCount: 0, needRetry: false}; 
        }
        visited[url].status = getLinksResult.status;
        visited[url].tryCount++;
        if (getLinksResult.status === HTTP_ERROR) {
            if (visited[url].tryCount < TRY_COUNT_LIMIT ) { 
                queue.push(url);
            }
        } else if (getLinksResult.status === HTTP_OK) { 
            getLinksResult.links.map((link) => {
                if (!(link in visited) && ! (queue.includes(link)) && new URL(link).origin === domainName) {
                    queue.push(link);
                }
            })
        }
    }
    return visited;
}

async function getLinks (url, domainName) { 
    const result = await fetcher(url);
    let links = [];
    if (result.status === HTTP_OK) {
        const pageContent = await result.text(); 
        links = parseLinksFromPage(pageContent).map(
        link => new URL(link, domainName).href);
    }
    return {links, status: result.status}
}

function parseLinksFromPage(pageContent) { 
    const linkRx = /<a href="[^"]*">/g; 
    const aTags = pageContent.match(linkRx); 
    let links = [];
    if (Array.isArray (aTags)) {
        links = aTags.map(parseLink);
    }
    return links;
}

function parseLink(link) {
    const hrefRx = /href=(["'])(.*?)\1/;
    return link.match(hrefRx)[2];
}

function getGoodLinks(visited) {
    return Object.keys(visited).filter(key => visited[key].status === 200);
}