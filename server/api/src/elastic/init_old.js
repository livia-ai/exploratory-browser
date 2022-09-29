import fs from 'fs';
import Papa from 'papaparse';
import zlib from 'zlib';

const MAPPING = {
  properties: {
    id: { type: 'keyword' },
    museum: { type: 'keyword' },
    title: { type: 'text' },
    description: { type: 'text' },
    record_url: { type: 'keyword', index: false },
    image_url: { type: 'keyword', index: false }
  }
}

const init = client => () => {
  console.log('[ElasticSearch] Checking if index exists');

  client.indices.exists({ index: 'livia' }).then(exists => {
    if (!exists) {
      client.indices.create({ 
        index: 'livia',
        body: { mappings: MAPPING }
      }).then(() => {
        console.log('[ElasticSearch] No index - created new');
        console.log('[ElasticSearch] Loading data');
        ingest().then(data => {
          console.log('[ElasticSearch] Preparing data for ingest');
          
          const operations = data.flatMap(doc => ([ { index: { _index: 'livia' } }, doc ]));
          console.log('[ElasticSearch] Ingesting');

          client.bulk({ refresh: true, operations }).then(() => {
            console.log('[ElasticSearch] Ingest complete' );
          })         
        });
      });
    } else {
      console.log('[ElasticSearch] Exists');
    }
  });
}

const ingest = () => new Promise(resolve => {
  const stream = 
    fs.createReadStream('../data/image_embedding_bel.jsonl.gz')
      .pipe(zlib.createGunzip());

  const config = {
    header: true
  };

  Papa.parse(stream, {
    ...config,
    complete: results => {
      resolve(results.data.map(record => ({
        id: record.priref,
        museum: 'MAK',
        title: record.title,
        description: record.description ? record.description : null, 
        record_url: record.url,
        image_url: record.reproduction
      })));
    }
  });
});

export default init;