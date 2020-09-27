module.exports = function(RED) {
    const https = require("https");

    const clearString = (s) => (s || "").split(/\s/).join("");
    const parseDomains = (s) => clearString(s).split(",").filter((e) => e);

    const statusRequesting = (node) => node.status({fill: "blue", shape: "dot", text: "requesting..."});
    const statusKO = (node) => node.status({fill: "red", shape: "ring", text: "failed"});
    const statusClear = (node) => node.status({});

    function DuckDNSNode(config) {
        RED.nodes.createNode(this, config);
        const node = this;

        node.on('input', function(msg) {
            const domains = clearString(config.domains || msg.domains);
            const token = clearString(this.credentials.token || msg.token);
            const ip = clearString(config.ip || msg.ip);
            const ipv6 = clearString(config.ipv6 || msg.ipv6);
            const clear = config.clear || msg.clear || false;
            const verbose = config.verbose || msg.verbose || false;

            if (!token) {
                node.error("No token specified for DuckDNS!");
                return;
            }
            if (!parseDomains(domains).length) {
                node.error("No domains specified for DuckDNS update!");
                return;
            }

            let url = `https://www.duckdns.org/update?&token=${token}`;

            if (!clear) {
                url = `${url}&domains=${domains}`;

                if (ip) url = `${url}&ip=${ip}`;
                if (ipv6) url = `${url}&ipv6=${ipv6}`;
            } else {
                url = `${url}&clear=true`;
            }

            if (verbose) url = `${url}&verbose=true`;

            //console.log("Requesting DuckDNS with URL: " + url)
            statusRequesting(node);

            https.get(url, (resp) => {
                let data = "";

                resp.on("data", (chunk) => {
                    data += chunk;
                });

                resp.on("end", () => {
                    msg.payload = data;
                    
                    if (msg.payload.startsWith("OK")) {
                        statusClear(node);
                        node.send(msg);
                    } else {
                        statusKO(node);
                        node.error("DuckDNS domain/s update failed! Response received: " + msg.payload);
                    }
                })
            })
            .on("error", (err) => {
                statusKO(node);
                node.error(err.message);
            });
        });
    }

    RED.nodes.registerType("duckdns", DuckDNSNode, {
        credentials: {
            token: {
                type: "text",
                required: true
            }
        }
    });
}
