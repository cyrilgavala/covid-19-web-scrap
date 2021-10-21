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
            data: '.govuk-body',
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
                const now = new Date();
                const numOfTests = parseInt(data[0].data.substring(data[0].data.indexOf(":") + 2).replace(/\s/g, ""))
                const confirmed = parseInt(data[1].data.substring(data[1].data.indexOf(":") + 2).replace(/\s/g, ""))
                const deaths = parseInt(data[17].data.substring(data[17].data.indexOf(":") + 2).replace(/\s/g, ""))
                now.setUTCHours(0, 0, 0, 0);
                collection.findOneAndUpdate({"date": now}, {
                    $set: {
                        "numberOfTests": numOfTests,
                        "confirmed": confirmed,
                        "deaths": deaths,
                        "date": now
                    }
                }, {upsert: true}).then(() => {
                    console.log("Data saved to database");
                    client.close().then().catch(console.error);
                }).catch(err => console.error("Entry was not saved", err));
            }).catch(err => console.error("Database unreachable:", err))
    }).catch(console.error)