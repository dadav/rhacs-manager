import { __rest } from "tslib";
import { jsx as _jsx, Fragment as _Fragment } from "react/jsx-runtime";
import { css } from '@patternfly/react-styles';
import styles from '@patternfly/react-styles/css/components/DualListSelector/dual-list-selector.mjs';
import { DualListSelectorTreeItem } from './DualListSelectorTreeItem';
export const DualListSelectorTree = (_a) => {
    var { data, hasBadges = false, isNested = false, defaultAllExpanded = false, onOptionCheck, isDisabled = false } = _a, props = __rest(_a, ["data", "hasBadges", "isNested", "defaultAllExpanded", "onOptionCheck", "isDisabled"]);
    const dataToRender = typeof data === 'function' ? data() : data;
    const tree = dataToRender.map((item) => (_jsx(DualListSelectorTreeItem, Object.assign({ text: item.text, id: item.id, defaultExpanded: item.defaultExpanded !== undefined ? item.defaultExpanded : defaultAllExpanded, onOptionCheck: onOptionCheck, isChecked: item.isChecked, checkProps: item.checkProps, hasBadge: item.hasBadge !== undefined ? item.hasBadge : hasBadges, badgeProps: item.badgeProps, itemData: item, isDisabled: isDisabled, useMemo: true }, (item.children && {
        children: (_jsx(DualListSelectorTree, { isNested: true, data: item.children, hasBadges: hasBadges, defaultAllExpanded: defaultAllExpanded, onOptionCheck: onOptionCheck, isDisabled: isDisabled }))
    })), item.id)));
    return isNested ? (_jsx("ul", Object.assign({ className: css(styles.dualListSelectorList), role: "group" }, props, { children: tree }))) : (_jsx(_Fragment, { children: tree }));
};
DualListSelectorTree.displayName = 'DualListSelectorTree';
//# sourceMappingURL=DualListSelectorTree.js.map