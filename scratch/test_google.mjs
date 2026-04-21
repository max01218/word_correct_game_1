const payload = {
    app_version: 0.4,
    api_level: '537.36',
    device: 'NodeTest',
    input_type: 0,
    options: 'enable_pre_space',
    requests: [
      {
        writing_guide: { writing_area_width: 320, writing_area_height: 320 },
        ink: [ [ [10, 20, 30], [50, 60, 70] ] ],
        language: 'zh-TW'
      }
    ]
  };

fetch('https://inputtools.google.com/request?ime=handwriting&app=mobilesearch&cs=1&oe=UTF-8', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload)
}).then(r => r.json()).then(console.log).catch(console.error);
