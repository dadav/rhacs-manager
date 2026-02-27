import { __rest } from "tslib";
import { jsx as _jsx } from "react/jsx-runtime";
import styles from '@patternfly/react-styles/css/components/SkipToContent/skip-to-content.mjs';
import { css } from '@patternfly/react-styles';
import { Button, ButtonVariant } from '../Button';
export const SkipToContent = (_a) => {
    var { children = null, className = '', href } = _a, props = __rest(_a, ["children", "className", "href"]);
    return (_jsx("div", Object.assign({ className: css(styles.skipToContent, className) }, props, { children: _jsx(Button, { variant: ButtonVariant.primary, component: "a", href: href, children: children }) })));
};
SkipToContent.displayName = 'SkipToContent';
//# sourceMappingURL=SkipToContent.js.map