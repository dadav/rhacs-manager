"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DataListItem = void 0;
const tslib_1 = require("tslib");
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const react_styles_1 = require("@patternfly/react-styles");
const data_list_1 = tslib_1.__importDefault(require("@patternfly/react-styles/css/components/DataList/data-list"));
const menu_1 = tslib_1.__importDefault(require("@patternfly/react-styles/css/components/Menu/menu"));
const DataList_1 = require("./DataList");
const constants_1 = require("../../helpers/constants");
class DataListItem extends react_1.Component {
    render() {
        const _a = this.props, { children, isExpanded, className, id, 'aria-labelledby': ariaLabelledBy, selectableInputAriaLabel } = _a, props = tslib_1.__rest(_a, ["children", "isExpanded", "className", "id", 'aria-labelledby', "selectableInputAriaLabel"]);
        return ((0, jsx_runtime_1.jsx)(DataList_1.DataListContext.Consumer, { children: ({ isSelectable, selectedDataListItemId, updateSelectedDataListItem, onSelectableRowChange }) => {
                const selectDataListItem = (event) => {
                    let target = event.target;
                    while (event.currentTarget !== target) {
                        if (('onclick' in target && target.onclick) ||
                            target.parentNode.classList.contains(data_list_1.default.dataListItemAction) ||
                            target.parentNode.classList.contains(data_list_1.default.dataListItemControl)) {
                            // check other event handlers are not present.
                            return;
                        }
                        else {
                            target = target.parentNode;
                        }
                    }
                    updateSelectedDataListItem(event, id);
                };
                const onKeyDown = (event) => {
                    if ([constants_1.KeyTypes.Enter, constants_1.KeyTypes.Space].includes(event.key)) {
                        const target = event.target;
                        if (target.closest(`.${menu_1.default.menuItem}`) ||
                            target.parentNode.classList.contains(data_list_1.default.dataListItemAction) ||
                            target.parentNode.classList.contains(data_list_1.default.dataListItemControl)) {
                            // check other event handlers are not present.
                            return;
                        }
                        event.preventDefault();
                        updateSelectedDataListItem(event, id);
                    }
                };
                const isSelected = selectedDataListItemId === id;
                const selectableInputAriaProps = selectableInputAriaLabel
                    ? { 'aria-label': selectableInputAriaLabel }
                    : { 'aria-labelledby': ariaLabelledBy };
                return ((0, jsx_runtime_1.jsxs)("li", Object.assign({ id: id, className: (0, react_styles_1.css)(data_list_1.default.dataListItem, isExpanded && data_list_1.default.modifiers.expanded, isSelectable && data_list_1.default.modifiers.clickable, selectedDataListItemId && isSelected && data_list_1.default.modifiers.selected, className) }, (isSelectable && { tabIndex: 0, onClick: selectDataListItem, onKeyDown }), props, { children: [onSelectableRowChange && ((0, jsx_runtime_1.jsx)("input", Object.assign({ className: "pf-v6-screen-reader", type: "radio", checked: isSelected, onChange: (event) => onSelectableRowChange(event, id), tabIndex: -1 }, selectableInputAriaProps))), react_1.Children.map(children, (child) => (0, react_1.isValidElement)(child) &&
                            (0, react_1.cloneElement)(child, {
                                rowid: ariaLabelledBy
                            }))] })));
            } }));
    }
}
exports.DataListItem = DataListItem;
DataListItem.displayName = 'DataListItem';
DataListItem.defaultProps = {
    isExpanded: false,
    className: '',
    id: '',
    children: null,
    'aria-labelledby': ''
};
//# sourceMappingURL=DataListItem.js.map