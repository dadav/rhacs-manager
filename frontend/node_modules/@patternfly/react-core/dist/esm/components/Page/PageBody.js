import { __rest } from "tslib";
import { jsx as _jsx } from "react/jsx-runtime";
import styles from '@patternfly/react-styles/css/components/Page/page.mjs';
import { css } from '@patternfly/react-styles';
export const PageBody = (_a) => {
    var { className, children } = _a, props = __rest(_a, ["className", "children"]);
    return (_jsx("div", Object.assign({}, props, { className: css(styles.pageMainBody, className), children: children })));
};
PageBody.displayName = 'PageBody';
//# sourceMappingURL=PageBody.js.map