import type {ClientSDK} from '@supergrowthai/plugin-dev-kit/client';
import {useEffect, useState} from '@supergrowthai/plugin-dev-kit/client';
import {ScanResponse} from './types';
import {LinkReport} from './components/LinkReport';
import {ScanButton} from './components/ScanButton';
import {StatusIndicator} from './components/StatusIndicator';
import {defineClient} from "@supergrowthai/plugin-dev-kit";
import './styles.css';

const renderPanel = (sdk: ClientSDK) => {
    const [isLoading, setIsLoading] = useState(true);
    const [isScanning, setIsScanning] = useState(false);
    const [report, setReport] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);

    // Fetch initial report on mount
    useEffect(() => {
        const fetchInitialReport = async () => {
            try {
                const response = await sdk.callRPC('broken-link-checker:scan-broken-links', {});

                if (response.code === 0) {
                    const {code, message, payload}: ScanResponse = response.payload;
                    if (code !== 0) {
                        throw new Error(message);
                    }
                    setReport(payload);
                } else {
                    throw new Error(response.message);
                }
            } catch (err: any) {
                setError(`Failed to fetch initial report: ${err.message}`);
            } finally {
                setIsLoading(false);
            }
        };

        fetchInitialReport();
    }, [sdk]);

    const startScan = async () => {
        if (isScanning) return;

        setIsScanning(true);
        setIsLoading(true);
        setError(null);

        try {
            const response = await sdk.callRPC('broken-link-checker:scan-broken-links', {
                start_scan: true
            });

            if (response.code === 0) {
                const {code, message, payload}: ScanResponse = response.payload;
                if (code !== 0) {
                    throw new Error(message);
                }
                setReport(payload);
                sdk.notify('Scan complete!', 'success');
            } else {
                throw new Error(response.message);
            }
        } catch (err: any) {
            const errorMsg = `Scan failed: ${err.message}`;
            setError(errorMsg);
            sdk.notify(errorMsg, 'error');
        } finally {
            setIsScanning(false);
            setIsLoading(false);
        }
    };

    const hasReport = report && report.length > 0;
    const showStatus = !hasReport || isLoading || isScanning || error;

    return (
        <div className="p-4 border rounded-lg shadow-sm bg-white">
            <div className="flex justify-between items-center mb-3">
                <h3 className="font-bold text-lg">Broken Link Checker</h3>
                <ScanButton
                    isScanning={isScanning}
                    onClick={startScan}
                />
            </div>

            {showStatus ? (
                <StatusIndicator state={{isLoading, isScanning, report, error, latestSdk: null}}/>
            ) : (
                <ul>
                    {report?.map((link: any, index: number) => (
                        <LinkReport key={index?.toString()} linkData={link}/>
                    ))}
                </ul>
            )}
        </div>
    );
};

export default defineClient({
    hooks: {
        'system:plugin:settings-panel': renderPanel
    },
    hasSettingsPanel: true,
});