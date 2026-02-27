import { __rest } from "tslib";
import { jsx as _jsx } from "react/jsx-runtime";
import styles from '@patternfly/react-styles/css/components/HelperText/helper-text.mjs';
import { css } from '@patternfly/react-styles';
export const HelperText = (_a) => {
    var { children, className, component = 'div', id, isLiveRegion = false, 'aria-label': ariaLabel } = _a, props = __rest(_a, ["children", "className", "component", "id", "isLiveRegion", 'aria-label']);
    const Component = component;
    return (_jsx(Component, Object.assign({ id: id, className: css(styles.helperText, className) }, (isLiveRegion && { 'aria-live': 'polite' }), (component === 'ul' && { role: 'list', 'aria-label': ariaLabel }), props, { children: children })));
};
HelperText.displayName = 'HelperText';
//# sourceMappingURL=HelperText.js.map