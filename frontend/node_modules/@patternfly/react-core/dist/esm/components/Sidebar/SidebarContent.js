import { __rest } from "tslib";
import { jsx as _jsx } from "react/jsx-runtime";
import { css } from '@patternfly/react-styles';
import styles from '@patternfly/react-styles/css/components/Sidebar/sidebar.mjs';
export const SidebarContent = (_a) => {
    var { className, children, hasNoBackground, hasPadding, backgroundVariant = 'default' } = _a, props = __rest(_a, ["className", "children", "hasNoBackground", "hasPadding", "backgroundVariant"]);
    return (_jsx("div", Object.assign({ className: css(styles.sidebarContent, hasNoBackground && styles.modifiers.noBackground, hasPadding && styles.modifiers.padding, backgroundVariant !== 'default' && styles.modifiers[backgroundVariant], className) }, props, { children: children })));
};
SidebarContent.displayName = 'SidebarContent';
//# sourceMappingURL=SidebarContent.js.map