import { __rest } from "tslib";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Children, Component, cloneElement, isValidElement } from 'react';
import { css } from '@patternfly/react-styles';
import styles from '@patternfly/react-styles/css/components/DataList/data-list.mjs';
import menuStyles from '@patternfly/react-styles/css/components/Menu/menu.mjs';
import { DataListContext } from './DataList';
import { KeyTypes } from '../../helpers/constants';
class DataListItem extends Component {
    render() {
        const _a = this.props, { children, isExpanded, className, id, 'aria-labelledby': ariaLabelledBy, selectableInputAriaLabel } = _a, props = __rest(_a, ["children", "isExpanded", "className", "id", 'aria-labelledby', "selectableInputAriaLabel"]);
        return (_jsx(DataListContext.Consumer, { children: ({ isSelectable, selectedDataListItemId, updateSelectedDataListItem, onSelectableRowChange }) => {
                const selectDataListItem = (event) => {
                    let target = event.target;
                    while (event.currentTarget !== target) {
                        if (('onclick' in target && target.onclick) ||
                            target.parentNode.classList.contains(styles.dataListItemAction) ||
                            target.parentNode.classList.contains(styles.dataListItemControl)) {
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
                    if ([KeyTypes.Enter, KeyTypes.Space].includes(event.key)) {
                        const target = event.target;
                        if (target.closest(`.${menuStyles.menuItem}`) ||
                            target.parentNode.classList.contains(styles.dataListItemAction) ||
                            target.parentNode.classList.contains(styles.dataListItemControl)) {
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
                return (_jsxs("li", Object.assign({ id: id, className: css(styles.dataListItem, isExpanded && styles.modifiers.expanded, isSelectable && styles.modifiers.clickable, selectedDataListItemId && isSelected && styles.modifiers.selected, className) }, (isSelectable && { tabIndex: 0, onClick: selectDataListItem, onKeyDown }), props, { children: [onSelectableRowChange && (_jsx("input", Object.assign({ className: "pf-v6-screen-reader", type: "radio", checked: isSelected, onChange: (event) => onSelectableRowChange(event, id), tabIndex: -1 }, selectableInputAriaProps))), Children.map(children, (child) => isValidElement(child) &&
                            cloneElement(child, {
                                rowid: ariaLabelledBy
                            }))] })));
            } }));
    }
}
DataListItem.displayName = 'DataListItem';
DataListItem.defaultProps = {
    isExpanded: false,
    className: '',
    id: '',
    children: null,
    'aria-labelledby': ''
};
export { DataListItem };
//# sourceMappingURL=DataListItem.js.map