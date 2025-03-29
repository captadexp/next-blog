import {h} from "preact";
import {renderToString} from "preact-render-to-string";

export default function NotFoundPage() {
    return <div>404 - Not Found</div>;
}


NotFoundPage.toString = function () {
    return renderToString(<NotFoundPage/>, {})
}