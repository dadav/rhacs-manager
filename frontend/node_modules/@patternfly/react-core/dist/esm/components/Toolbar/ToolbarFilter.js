import { __rest } from "tslib";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Component, Fragment } from 'react';
import * as ReactDOM from 'react-dom';
import { ToolbarItem } from './ToolbarItem';
import { ToolbarContentContext, ToolbarContext } from './ToolbarUtils';
import { Label, LabelGroup } from '../Label';
class ToolbarFilter extends Component {
    constructor(props) {
        super(props);
        this.state = {
            isMounted: false
        };
    }
    componentDidMount() {
        const { categoryName, labels } = this.props;
        this.context.updateNumberFilters(typeof categoryName !== 'string' && categoryName.hasOwnProperty('key')
            ? categoryName.key
            : categoryName.toString(), labels.length);
        this.setState({ isMounted: true });
    }
    componentDidUpdate() {
        const { categoryName, labels } = this.props;
        this.context.updateNumberFilters(typeof categoryName !== 'string' && categoryName.hasOwnProperty('key')
            ? categoryName.key
            : categoryName.toString(), labels.length);
    }
    render() {
        var _a;
        const _b = this.props, { children, labels, deleteLabelGroup, deleteLabel, labelGroupExpandedText, labelGroupCollapsedText, categoryName, showToolbarItem, isExpanded, expandableLabelContainerRef } = _b, props = __rest(_b, ["children", "labels", "deleteLabelGroup", "deleteLabel", "labelGroupExpandedText", "labelGroupCollapsedText", "categoryName", "showToolbarItem", "isExpanded", "expandableLabelContainerRef"]);
        const { isExpanded: managedIsExpanded, labelGroupContentRef } = this.context;
        const _isExpanded = isExpanded !== undefined ? isExpanded : managedIsExpanded;
        const categoryKey = typeof categoryName !== 'string' && categoryName.hasOwnProperty('key')
            ? categoryName.key
            : categoryName.toString();
        const labelGroup = labels.length ? (_jsx(ToolbarItem, { variant: "label-group", children: _jsx(LabelGroup, { categoryName: typeof categoryName === 'string' ? categoryName : categoryName.name, isClosable: deleteLabelGroup !== undefined, onClick: () => deleteLabelGroup(categoryName), collapsedText: labelGroupCollapsedText, expandedText: labelGroupExpandedText, children: labels.map((label) => typeof label === 'string' ? (_jsx(Label, { variant: "outline", onClose: () => deleteLabel(categoryKey, label), children: label }, label)) : (_jsx(Label, { onClose: () => deleteLabel(categoryKey, label), children: label.node }, label.key))) }, categoryKey) })) : null;
        if (!_isExpanded && this.state.isMounted) {
            return (_jsxs(Fragment, { children: [showToolbarItem && _jsx(ToolbarItem, Object.assign({}, props, { children: children })), ((_a = labelGroupContentRef === null || labelGroupContentRef === void 0 ? void 0 : labelGroupContentRef.current) === null || _a === void 0 ? void 0 : _a.firstElementChild) !== null &&
                        ReactDOM.createPortal(labelGroup, labelGroupContentRef.current.firstElementChild)] }));
        }
        return (_jsx(ToolbarContentContext.Consumer, { children: ({ labelContainerRef }) => (_jsxs(Fragment, { children: [showToolbarItem && _jsx(ToolbarItem, Object.assign({}, props, { children: children })), labelContainerRef.current && ReactDOM.createPortal(labelGroup, labelContainerRef.current), expandableLabelContainerRef &&
                        expandableLabelContainerRef.current &&
                        ReactDOM.createPortal(labelGroup, expandableLabelContainerRef.current)] })) }));
    }
}
ToolbarFilter.displayName = 'ToolbarFilter';
ToolbarFilter.contextType = ToolbarContext;
ToolbarFilter.defaultProps = {
    labels: [],
    showToolbarItem: true
};
export { ToolbarFilter };
//# sourceMappingURL=ToolbarFilter.js.map