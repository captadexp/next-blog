(() => {
    return {
        hooks: {
            "dashboard-widget": (sdk, context) => {
                return ['div', {class: 'card'},
                    ['div', {class: 'card-body'},
                        ['h5', {class: 'card-title'}, 'Test Plugin'],
                        ['p', {class: 'card-text'}, 'This is a test plugin widget.'],
                    ]
                ];
            }
        }
    }
})()
