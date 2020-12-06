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
    }).catch(console.error)

const clientResolved = Promise.resolve(MongoClient.connect(uri, {useUnifiedTopology: true})
    .catch(err => console.error("Database unreachable:", err.name)));
if (clientResolved === undefined) return false;
const collection = clientResolved.db("covid-data").collection("daily-data");
let now = new Date();
now.setUTCHours(0, 0, 0, 0);
const dailyDataResolved = Promise.resolve(collection.findOne({"date": now}, {}));
if (dailyDataResolved === null) {
    let confirmed = parseInt(data[1].number.replace(/\s/g, "")),
        recovered = parseInt(data[6].number.replace(/\s/g, "")),
        deaths = parseInt(data[7].number.replace(/\s/g, ""));
    let active = confirmed - recovered - deaths;
    collection.insertOne({
        numberOfTests: parseInt(data[0].number.replace(/\s/g, "")),
        confirmed: confirmed,
        active: active,
        recovered: recovered,
        deaths: deaths,
        date: now
    }).catch(err => console.error("Entry was not saved", err));
    console.log("Data saved to database");
}
clientResolved.close();
console.log("Process finished");