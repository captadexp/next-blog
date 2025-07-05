(() => {
    return {
        hooks: {
            "server-hook-test": (sdk, context) => {
                console.log("****** SERVER HOOK TEST EXECUTED ******");
                return {...context, serverHookExecuted: true};
            }
        },
        rpc: {
            "test-rpc": (sdk, context) => {
                console.log("****** TEST RPC EXECUTED ******");
                return {...context, rpcExecuted: true};
            }
        }
    }
})()
