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
            number: 'h2, h3',
            label: 'p',
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
                let confirmed = parseInt(data[1].number.replace(/\s/g, "")),
                    recovered = parseInt(data[6].number.replace(/\s/g, "")),
                    deaths = parseInt(data[7].number.replace(/\s/g, "")),
                    active = confirmed - recovered - deaths;
                collection.findOneAndUpdate({"date": now}, {
                    $set: {
                        "numberOfTests": parseInt(data[0].number.replace(/\s/g, "")),
                        "confirmed": confirmed,
                        "active": active,
                        "recovered": recovered,
                        "deaths": deaths,
                        "date": now
                    }
                }, {upsert: true}).then(() => {
                    console.log("Data saved to database");
                    client.close().then(r => console.log("Process finished", r)).catch(console.error);
                }).catch(err => console.error("Entry was not saved", err));
            }).catch(err => console.error("Database unreachable:", err))
    }).catch(console.error)