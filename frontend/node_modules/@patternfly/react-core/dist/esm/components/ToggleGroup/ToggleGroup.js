import { __rest } from "tslib";
import { jsx as _jsx } from "react/jsx-runtime";
import { Children, cloneElement, isValidElement } from 'react';
import { css } from '@patternfly/react-styles';
import styles from '@patternfly/react-styles/css/components/ToggleGroup/toggle-group.mjs';
import { ToggleGroupItem } from './ToggleGroupItem';
export const ToggleGroup = (_a) => {
    var { className, children, isCompact = false, areAllGroupsDisabled = false, 'aria-label': ariaLabel } = _a, props = __rest(_a, ["className", "children", "isCompact", "areAllGroupsDisabled", 'aria-label']);
    const toggleGroupItemList = Children.map(children, (child) => !(isValidElement(child) && child.type === ToggleGroupItem)
        ? child
        : cloneElement(child, areAllGroupsDisabled ? { isDisabled: true } : {}));
    return (_jsx("div", Object.assign({ className: css(styles.toggleGroup, isCompact && styles.modifiers.compact, className), role: "group", "aria-label": ariaLabel }, props, { children: toggleGroupItemList })));
};
ToggleGroup.displayName = 'ToggleGroup';
//# sourceMappingURL=ToggleGroup.js.map