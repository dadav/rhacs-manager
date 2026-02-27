import { __rest } from "tslib";
import { jsx as _jsx } from "react/jsx-runtime";
import { css } from '@patternfly/react-styles';
import styles from '@patternfly/react-styles/css/components/AboutModalBox/about-modal-box.mjs';
import { Title } from '../Title';
export const AboutModalBoxHeader = (_a) => {
    var { productName, id } = _a, props = __rest(_a, ["productName", "id"]);
    return (_jsx("div", Object.assign({ className: css(styles.aboutModalBoxHeader) }, props, { children: _jsx(Title, { headingLevel: "h1", size: "4xl", id: id, children: productName }) })));
};
AboutModalBoxHeader.displayName = 'AboutModalBoxHeader';
//# sourceMappingURL=AboutModalBoxHeader.js.map