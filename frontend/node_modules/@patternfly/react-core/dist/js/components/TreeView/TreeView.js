"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TreeView = void 0;
const tslib_1 = require("tslib");
const jsx_runtime_1 = require("react/jsx-runtime");
const TreeViewList_1 = require("./TreeViewList");
const TreeViewListItem_1 = require("./TreeViewListItem");
const TreeViewRoot_1 = require("./TreeViewRoot");
const helpers_1 = require("../../helpers");
const TreeView = (_a) => {
    var { data, isNested = false, hasCheckboxes = false, hasBadges = false, hasGuides = false, hasSelectableNodes = false, variant = 'default', defaultAllExpanded = false, allExpanded, icon, isMultiSelectable = false, expandedIcon, parentItem, onSelect, onCheck, onExpand, onCollapse, toolbar, activeItems, compareItems = (item, itemToCheck) => item.id === itemToCheck.id, className, useMemo, 'aria-label': ariaLabel, 'aria-labelledby': ariaLabelledby, hasAnimations: hasAnimationsProp } = _a, props = tslib_1.__rest(_a, ["data", "isNested", "hasCheckboxes", "hasBadges", "hasGuides", "hasSelectableNodes", "variant", "defaultAllExpanded", "allExpanded", "icon", "isMultiSelectable", "expandedIcon", "parentItem", "onSelect", "onCheck", "onExpand", "onCollapse", "toolbar", "activeItems", "compareItems", "className", "useMemo", 'aria-label', 'aria-labelledby', "hasAnimations"]);
    const hasAnimations = (0, helpers_1.useHasAnimations)(hasAnimationsProp);
    const treeViewList = ((0, jsx_runtime_1.jsx)(TreeViewList_1.TreeViewList, Object.assign({ isNested: isNested, toolbar: toolbar, isMultiSelectable: isMultiSelectable, "aria-label": ariaLabel, "aria-labelledby": ariaLabelledby }, props, { children: data.map((item) => {
            var _a, _b;
            return ((0, jsx_runtime_1.jsx)(TreeViewListItem_1.TreeViewListItem, Object.assign({ name: item.name, hasAnimations: hasAnimations, title: item.title, id: item.id, isExpanded: allExpanded, isSelectable: hasSelectableNodes, defaultExpanded: item.defaultExpanded !== undefined ? item.defaultExpanded : defaultAllExpanded, onSelect: onSelect, onCheck: onCheck, onExpand: onExpand, onCollapse: onCollapse, hasCheckbox: item.hasCheckbox !== undefined ? item.hasCheckbox : hasCheckboxes, checkProps: item.checkProps, hasBadge: item.hasBadge !== undefined ? item.hasBadge : hasBadges, customBadgeContent: item.customBadgeContent, badgeProps: item.badgeProps, activeItems: activeItems, parentItem: parentItem, itemData: item, icon: item.icon !== undefined ? item.icon : icon, expandedIcon: item.expandedIcon !== undefined ? item.expandedIcon : expandedIcon, action: item.action, compareItems: compareItems, isCompact: variant === 'compact' || variant === 'compactNoBackground', useMemo: useMemo }, (item.children && {
                children: ((0, jsx_runtime_1.jsx)(exports.TreeView, { data: item.children, isNested: true, hasAnimations: hasAnimations, parentItem: item, hasCheckboxes: hasCheckboxes, hasBadges: hasBadges, hasGuides: hasGuides, hasSelectableNodes: hasSelectableNodes, variant: variant, allExpanded: allExpanded, defaultAllExpanded: defaultAllExpanded, onSelect: onSelect, onCheck: onCheck, onExpand: onExpand, onCollapse: onCollapse, activeItems: activeItems, icon: icon, expandedIcon: expandedIcon }))
            })), ((_a = item.id) === null || _a === void 0 ? void 0 : _a.toString()) || ((_b = item.name) === null || _b === void 0 ? void 0 : _b.toString())));
        }) })));
    return ((0, jsx_runtime_1.jsx)(jsx_runtime_1.Fragment, { children: parentItem ? (treeViewList) : ((0, jsx_runtime_1.jsx)(TreeViewRoot_1.TreeViewRoot, Object.assign({ hasSelectableNodes: hasSelectableNodes, hasCheckboxes: hasCheckboxes, hasGuides: hasGuides, variant: variant, className: className }, props, { children: treeViewList }))) }));
};
exports.TreeView = TreeView;
exports.TreeView.displayName = 'TreeView';
//# sourceMappingURL=TreeView.js.map