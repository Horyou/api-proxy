# api-proxy
=======

The purpose of this project is to offer a transparent proxy on an existing API
with filesystem based fixtures.


## Launch

```bash
$ REMOTE=https://my-remote-api node index.js
```

This will start the server by default on localhost and port 5000.

* All url will first be searched as a path of a file in `public`. 
* If found, the content of the file is returned. 
* Else, the request is proxified to REMOTE, if REMOTE is defined
