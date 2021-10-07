const MongoClient = require('mongodb').MongoClient;
const scrapy = require('node-scrapy');
const fetch = require('node-fetch');
const uri = process.env.DB_URL;
let data = [];

console.log("Process started")
const url = 'https://korona.gov.sk/koronavirus-na-slovensku-v-cislach/';
const model = {
    infos: [
        '.app-pane-gray',
        {
            data: 'p',
        },
    ]
};
fetch(url).then((res) => res.text()).catch(console.error)
    .then((body) => {
        data = scrapy.extract(body, model).infos
        console.log("Data extracted")
        MongoClient.connect(uri, {useUnifiedTopology: true})
            .then(client => {
                const collection = client.db("covid-data").collection("daily-data");
                let now = new Date();
                now.setUTCHours(0, 0, 0, 0);
                collection.findOneAndUpdate({"date": now}, {
                    $set: {
                        "numberOfTests": parseInt(data[0].data.substring(data[0].data.indexOf(": ") + 2).replace(/\s/g, "")),
                        "confirmed": parseInt(data[1].data.substring(data[1].data.indexOf(": ") + 2).replace(/\s/g, "")),
                        "deaths": parseInt(data[15].data.substring(data[6].data.indexOf(": ") + 2).replace(/\s/g, "")),
                        "date": now
                    }
                }, {upsert: true}).then(() => {
                    console.log("Data saved to database");
                    client.close().then().catch(console.error);
                }).catch(err => console.error("Entry was not saved", err));
            }).catch(err => console.error("Database unreachable:", err))
    }).catch(console.error)