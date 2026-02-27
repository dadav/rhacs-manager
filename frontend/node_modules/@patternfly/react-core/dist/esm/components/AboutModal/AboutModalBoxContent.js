import { __rest } from "tslib";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { css } from '@patternfly/react-styles';
import styles from '@patternfly/react-styles/css/components/AboutModalBox/about-modal-box.mjs';
import contentStyles from '@patternfly/react-styles/css/components/Content/content.mjs';
export const AboutModalBoxContent = (_a) => {
    var { children, trademark, hasNoContentContainer = false } = _a, props = __rest(_a, ["children", "trademark", "hasNoContentContainer"]);
    return (_jsxs("div", Object.assign({ className: css(styles.aboutModalBoxContent) }, props, { children: [_jsx("div", { className: css(`${styles.aboutModalBox}__body`), children: hasNoContentContainer ? children : _jsx("div", { className: css(contentStyles.content), children: children }) }), _jsx("p", { className: css(styles.aboutModalBoxStrapline), children: trademark })] })));
};
AboutModalBoxContent.displayName = 'AboutModalBoxContent';
//# sourceMappingURL=AboutModalBoxContent.js.map