"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TreeViewListItem = void 0;
const tslib_1 = require("tslib");
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const react_styles_1 = require("@patternfly/react-styles");
const tree_view_1 = tslib_1.__importDefault(require("@patternfly/react-styles/css/components/TreeView/tree-view"));
const angle_right_icon_1 = tslib_1.__importDefault(require('@patternfly/react-icons/dist/js/icons/angle-right-icon'));
const Badge_1 = require("../Badge");
const GenerateId_1 = require("../../helpers/GenerateId/GenerateId");
const helpers_1 = require("../../helpers");
const TreeViewListItemBase = ({ name, title, id, isExpanded, defaultExpanded = false, children = null, onSelect, onExpand, onCollapse, onCheck, hasCheckbox = false, checkProps = {
    checked: false
}, hasBadge = false, customBadgeContent, badgeProps = { isRead: true }, isSelectable = false, isCompact, activeItems = [], itemData, parentItem, icon, expandedIcon, action, compareItems, hasAnimations: hasAnimationsProp, 
// eslint-disable-next-line @typescript-eslint/no-unused-vars
useMemo }) => {
    const hasAnimations = (0, helpers_1.useHasAnimations)(hasAnimationsProp);
    const [internalIsExpanded, setIsExpanded] = (0, react_1.useState)(defaultExpanded);
    (0, react_1.useEffect)(() => {
        if (isExpanded !== undefined && isExpanded !== null) {
            setIsExpanded(isExpanded);
        }
        else if (defaultExpanded !== undefined && defaultExpanded !== null) {
            setIsExpanded(internalIsExpanded || defaultExpanded);
        }
    }, [isExpanded, defaultExpanded]);
    let Component = 'button';
    if (hasCheckbox) {
        Component = 'label';
    }
    else if (isSelectable) {
        Component = 'div';
    }
    const ToggleComponent = hasCheckbox || isSelectable ? 'button' : 'span';
    const renderToggle = (randomId) => ((0, jsx_runtime_1.jsx)(ToggleComponent, Object.assign({ className: (0, react_styles_1.css)(tree_view_1.default.treeViewNodeToggle), onClick: (evt) => {
            if (isSelectable || hasCheckbox) {
                if (internalIsExpanded) {
                    onCollapse && onCollapse(evt, itemData, parentItem);
                }
                else {
                    onExpand && onExpand(evt, itemData, parentItem);
                }
                setIsExpanded(!internalIsExpanded);
            }
            if (isSelectable) {
                evt.stopPropagation();
            }
        } }, ((hasCheckbox || isSelectable) && { 'aria-labelledby': `label-${randomId}` }), (ToggleComponent === 'button' && { type: 'button' }), { tabIndex: -1, children: (0, jsx_runtime_1.jsx)("span", { className: (0, react_styles_1.css)(tree_view_1.default.treeViewNodeToggleIcon), children: (0, jsx_runtime_1.jsx)(angle_right_icon_1.default, {}) }) })));
    const isCheckboxChecked = checkProps.checked === null ? false : checkProps.checked;
    const renderCheck = (randomId) => ((0, jsx_runtime_1.jsx)("span", { className: (0, react_styles_1.css)(tree_view_1.default.treeViewNodeCheck), children: (0, jsx_runtime_1.jsx)("input", Object.assign({ type: "checkbox", onChange: (evt) => onCheck && onCheck(evt, itemData, parentItem), onClick: (evt) => evt.stopPropagation(), ref: (elem) => {
                elem && (elem.indeterminate = checkProps.checked === null);
            } }, checkProps, { checked: isCheckboxChecked, id: randomId, tabIndex: -1 })) }));
    const iconRendered = ((0, jsx_runtime_1.jsxs)("span", { className: (0, react_styles_1.css)(tree_view_1.default.treeViewNodeIcon), children: [!internalIsExpanded && icon, internalIsExpanded && (expandedIcon || icon)] }));
    const renderNodeContent = () => {
        const content = ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [isCompact && title && (0, jsx_runtime_1.jsx)("span", { className: (0, react_styles_1.css)(tree_view_1.default.treeViewNodeTitle), children: title }), isSelectable ? ((0, jsx_runtime_1.jsx)("button", { tabIndex: -1, className: (0, react_styles_1.css)(tree_view_1.default.treeViewNodeText), type: "button", children: name })) : ((0, jsx_runtime_1.jsx)("span", { className: (0, react_styles_1.css)(tree_view_1.default.treeViewNodeText), children: name }))] }));
        return isCompact ? (0, jsx_runtime_1.jsx)("span", { className: (0, react_styles_1.css)(tree_view_1.default.treeViewNodeContent), children: content }) : content;
    };
    const badgeRendered = ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [hasBadge && children && ((0, jsx_runtime_1.jsx)("span", { className: (0, react_styles_1.css)(tree_view_1.default.treeViewNodeCount), children: (0, jsx_runtime_1.jsx)(Badge_1.Badge, Object.assign({}, badgeProps, { children: customBadgeContent !== null && customBadgeContent !== void 0 ? customBadgeContent : children.props.data.length })) })), hasBadge && !children && customBadgeContent !== undefined && ((0, jsx_runtime_1.jsx)("span", { className: (0, react_styles_1.css)(tree_view_1.default.treeViewNodeCount), children: (0, jsx_runtime_1.jsx)(Badge_1.Badge, Object.assign({}, badgeProps, { children: customBadgeContent })) }))] }));
    const isSelected = (!children || isSelectable) &&
        activeItems &&
        activeItems.length > 0 &&
        activeItems.some((item) => compareItems && item && compareItems(item, itemData));
    const clonedChildren = react_1.Children.map(children, (child) => (0, react_1.isValidElement)(child) &&
        (0, react_1.cloneElement)(child, {
            inert: internalIsExpanded ? undefined : ''
        }));
    return ((0, jsx_runtime_1.jsxs)("li", Object.assign({ id: id, className: (0, react_styles_1.css)(tree_view_1.default.treeViewListItem, internalIsExpanded && tree_view_1.default.modifiers.expanded), "aria-expanded": internalIsExpanded, role: "treeitem", tabIndex: -1 }, (hasCheckbox && { 'aria-checked': isCheckboxChecked }), (!hasCheckbox && { 'aria-selected': isSelected }), { children: [(0, jsx_runtime_1.jsxs)("div", { className: (0, react_styles_1.css)(tree_view_1.default.treeViewContent), children: [(0, jsx_runtime_1.jsx)(GenerateId_1.GenerateId, { prefix: isSelectable ? 'selectable-id' : 'checkbox-id', children: (randomId) => ((0, jsx_runtime_1.jsx)(Component, Object.assign({ className: (0, react_styles_1.css)(tree_view_1.default.treeViewNode, isSelected && tree_view_1.default.modifiers.current), onClick: (evt) => {
                                if (!hasCheckbox) {
                                    onSelect && onSelect(evt, itemData, parentItem);
                                    if (!isSelectable && children && evt.isDefaultPrevented() !== true) {
                                        if (internalIsExpanded) {
                                            onCollapse && onCollapse(evt, itemData, parentItem);
                                        }
                                        else {
                                            onExpand && onExpand(evt, itemData, parentItem);
                                        }
                                        setIsExpanded(!internalIsExpanded);
                                    }
                                }
                            } }, (hasCheckbox && { htmlFor: randomId }), ((hasCheckbox || (isSelectable && children)) && { id: `label-${randomId}` }), (Component === 'button' && { type: 'button' }), { children: (0, jsx_runtime_1.jsxs)("span", { className: (0, react_styles_1.css)(tree_view_1.default.treeViewNodeContainer), children: [children && renderToggle(randomId), hasCheckbox && renderCheck(randomId), icon && iconRendered, renderNodeContent(), badgeRendered] }) }))) }), action && (0, jsx_runtime_1.jsx)("div", { className: (0, react_styles_1.css)(tree_view_1.default.treeViewAction), children: action })] }), (internalIsExpanded || hasAnimations) && clonedChildren] })));
};
exports.TreeViewListItem = (0, react_1.memo)(TreeViewListItemBase, (prevProps, nextProps) => {
    if (!nextProps.useMemo) {
        return false;
    }
    const prevIncludes = prevProps.activeItems &&
        prevProps.activeItems.length > 0 &&
        prevProps.activeItems.some((item) => prevProps.compareItems && item && prevProps.compareItems(item, prevProps.itemData));
    const nextIncludes = nextProps.activeItems &&
        nextProps.activeItems.length > 0 &&
        nextProps.activeItems.some((item) => nextProps.compareItems && item && nextProps.compareItems(item, nextProps.itemData));
    if (prevIncludes || nextIncludes) {
        return false;
    }
    if (prevProps.name !== nextProps.name ||
        prevProps.title !== nextProps.title ||
        prevProps.id !== nextProps.id ||
        prevProps.isExpanded !== nextProps.isExpanded ||
        prevProps.defaultExpanded !== nextProps.defaultExpanded ||
        prevProps.onSelect !== nextProps.onSelect ||
        prevProps.onCheck !== nextProps.onCheck ||
        prevProps.onExpand !== nextProps.onExpand ||
        prevProps.onCollapse !== nextProps.onCollapse ||
        prevProps.hasCheckbox !== nextProps.hasCheckbox ||
        prevProps.checkProps !== nextProps.checkProps ||
        prevProps.hasBadge !== nextProps.hasBadge ||
        prevProps.customBadgeContent !== nextProps.customBadgeContent ||
        prevProps.badgeProps !== nextProps.badgeProps ||
        prevProps.isCompact !== nextProps.isCompact ||
        prevProps.icon !== nextProps.icon ||
        prevProps.expandedIcon !== nextProps.expandedIcon ||
        prevProps.action !== nextProps.action ||
        prevProps.parentItem !== nextProps.parentItem ||
        prevProps.itemData !== nextProps.itemData) {
        return false;
    }
    return true;
});
exports.TreeViewListItem.displayName = 'TreeViewListItem';
//# sourceMappingURL=TreeViewListItem.js.map