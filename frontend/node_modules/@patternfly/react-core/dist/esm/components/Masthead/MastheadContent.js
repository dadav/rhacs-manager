import { __rest } from "tslib";
import { jsx as _jsx } from "react/jsx-runtime";
import styles from '@patternfly/react-styles/css/components/Masthead/masthead.mjs';
import { css } from '@patternfly/react-styles';
export const MastheadContent = (_a) => {
    var { children, className } = _a, props = __rest(_a, ["children", "className"]);
    return (_jsx("div", Object.assign({ className: css(styles.mastheadContent, className) }, props, { children: children })));
};
MastheadContent.displayName = 'MastheadContent';
//# sourceMappingURL=MastheadContent.js.map