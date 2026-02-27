import { __rest } from "tslib";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Fragment } from 'react';
import AngleRightIcon from '@patternfly/react-icons/dist/esm/icons/angle-right-icon';
import styles from '@patternfly/react-styles/css/components/Breadcrumb/breadcrumb.mjs';
import { css } from '@patternfly/react-styles';
export const BreadcrumbHeading = (_a) => {
    var { children = null, className = '', to = undefined, target = undefined, component = 'a', showDivider } = _a, props = __rest(_a, ["children", "className", "to", "target", "component", "showDivider"]);
    const Component = component;
    return (_jsxs("li", Object.assign({}, props, { className: css(styles.breadcrumbItem, className), children: [showDivider && (_jsx("span", { className: styles.breadcrumbItemDivider, children: _jsx(AngleRightIcon, {}) })), _jsxs("h1", { className: styles.breadcrumbHeading, children: [!to && component === 'button' && (_jsx("button", { className: css(styles.breadcrumbLink, styles.modifiers.current), "aria-current": true, type: "button", children: children })), to && (_jsx(Component, { href: to, target: target, className: css(styles.breadcrumbLink, styles.modifiers.current), "aria-current": "page", children: children })), !to && component !== 'button' && _jsx(Fragment, { children: children })] })] })));
};
BreadcrumbHeading.displayName = 'BreadcrumbHeading';
//# sourceMappingURL=BreadcrumbHeading.js.map