"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LabelGroup = void 0;
const tslib_1 = require("tslib");
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const label_group_1 = tslib_1.__importDefault(require("@patternfly/react-styles/css/components/Label/label-group"));
const label_1 = tslib_1.__importDefault(require("@patternfly/react-styles/css/components/Label/label"));
const react_styles_1 = require("@patternfly/react-styles");
const Button_1 = require("../Button");
const Label_1 = require("./Label");
const Tooltip_1 = require("../Tooltip");
const times_icon_1 = tslib_1.__importDefault(require('@patternfly/react-icons/dist/js/icons/times-icon'));
const helpers_1 = require("../../helpers");
const GenerateId_1 = require("../../helpers/GenerateId/GenerateId");
class LabelGroup extends react_1.Component {
    constructor(props) {
        super(props);
        this.headingRef = (0, react_1.createRef)();
        this.toggleCollapse = () => {
            this.setState((prevState) => ({
                isOpen: !prevState.isOpen,
                isTooltipVisible: Boolean(this.headingRef.current && this.headingRef.current.offsetWidth < this.headingRef.current.scrollWidth)
            }));
        };
        this.state = {
            isOpen: this.props.defaultIsOpen,
            isTooltipVisible: false
        };
    }
    componentDidMount() {
        this.setState({
            isTooltipVisible: Boolean(this.headingRef.current && this.headingRef.current.offsetWidth < this.headingRef.current.scrollWidth)
        });
    }
    renderLabel(id) {
        const { categoryName, tooltipPosition } = this.props;
        const { isTooltipVisible } = this.state;
        return isTooltipVisible ? ((0, jsx_runtime_1.jsx)(Tooltip_1.Tooltip, { position: tooltipPosition, content: categoryName, children: (0, jsx_runtime_1.jsx)("span", { tabIndex: 0, ref: this.headingRef, className: (0, react_styles_1.css)(label_group_1.default.labelGroupLabel), children: (0, jsx_runtime_1.jsx)("span", { "aria-hidden": "true", id: id, children: categoryName }) }) })) : ((0, jsx_runtime_1.jsx)("span", { ref: this.headingRef, className: (0, react_styles_1.css)(label_group_1.default.labelGroupLabel), "aria-hidden": "true", id: id, children: categoryName }));
    }
    render() {
        const _a = this.props, { categoryName, children, className, isClosable, isCompact, closeBtnAriaLabel, 'aria-label': ariaLabel, onClick, numLabels, expandedText, collapsedText, 
        /* eslint-disable @typescript-eslint/no-unused-vars */
        defaultIsOpen, tooltipPosition, isVertical, isEditable, hasEditableTextArea, editableTextAreaProps, addLabelControl } = _a, 
        /* eslint-enable @typescript-eslint/no-unused-vars */
        rest = tslib_1.__rest(_a, ["categoryName", "children", "className", "isClosable", "isCompact", "closeBtnAriaLabel", 'aria-label', "onClick", "numLabels", "expandedText", "collapsedText", "defaultIsOpen", "tooltipPosition", "isVertical", "isEditable", "hasEditableTextArea", "editableTextAreaProps", "addLabelControl"]);
        const { isOpen } = this.state;
        const renderedChildren = react_1.Children.toArray(children);
        const numChildren = renderedChildren.length;
        const collapsedTextResult = (0, helpers_1.fillTemplate)(collapsedText, {
            remaining: numChildren - numLabels
        });
        const renderLabelGroup = (id) => {
            const labelArray = !isOpen ? renderedChildren.slice(0, numLabels) : renderedChildren;
            const content = ((0, jsx_runtime_1.jsxs)(react_1.Fragment, { children: [categoryName && this.renderLabel(id), (0, jsx_runtime_1.jsxs)("ul", Object.assign({ className: (0, react_styles_1.css)(label_group_1.default.labelGroupList) }, (categoryName && { 'aria-labelledby': id }), (!categoryName && { 'aria-label': ariaLabel }), { role: "list" }, rest, { children: [labelArray.map((child, i) => ((0, jsx_runtime_1.jsx)("li", { className: (0, react_styles_1.css)(label_group_1.default.labelGroupListItem), children: child }, i))), numChildren > numLabels && ((0, jsx_runtime_1.jsx)("li", { className: (0, react_styles_1.css)(label_group_1.default.labelGroupListItem), children: (0, jsx_runtime_1.jsx)(Label_1.Label, { variant: "overflow", onClick: this.toggleCollapse, className: (0, react_styles_1.css)(isCompact && label_1.default.modifiers.compact), children: isOpen ? expandedText : collapsedTextResult }) })), addLabelControl && (0, jsx_runtime_1.jsx)("li", { className: (0, react_styles_1.css)(label_group_1.default.labelGroupListItem), children: addLabelControl }), isEditable && hasEditableTextArea && ((0, jsx_runtime_1.jsx)("li", { className: (0, react_styles_1.css)(label_group_1.default.labelGroupListItem, label_group_1.default.modifiers.textarea), children: (0, jsx_runtime_1.jsx)("textarea", Object.assign({ className: (0, react_styles_1.css)(label_group_1.default.labelGroupTextarea), rows: 1, tabIndex: 0 }, editableTextAreaProps)) }))] }))] }));
            const close = ((0, jsx_runtime_1.jsx)("div", { className: (0, react_styles_1.css)(label_group_1.default.labelGroupClose), children: (0, jsx_runtime_1.jsx)(Button_1.Button, { variant: "plain", size: "sm", "aria-label": closeBtnAriaLabel, onClick: onClick, id: `remove_group_${id}`, "aria-labelledby": `remove_group_${id} ${id}`, icon: (0, jsx_runtime_1.jsx)(times_icon_1.default, {}) }) }));
            return ((0, jsx_runtime_1.jsxs)("div", { className: (0, react_styles_1.css)(label_group_1.default.labelGroup, className, categoryName && label_group_1.default.modifiers.category, isVertical && label_group_1.default.modifiers.vertical, isEditable && label_group_1.default.modifiers.editable), children: [(0, jsx_runtime_1.jsx)("div", { className: (0, react_styles_1.css)(label_group_1.default.labelGroupMain), children: content }), isClosable && close] }));
        };
        return numChildren === 0 && addLabelControl === undefined ? null : ((0, jsx_runtime_1.jsx)(GenerateId_1.GenerateId, { children: (randomId) => renderLabelGroup(this.props.id || randomId) }));
    }
}
exports.LabelGroup = LabelGroup;
LabelGroup.displayName = 'LabelGroup';
LabelGroup.defaultProps = {
    expandedText: 'Show Less',
    collapsedText: '${remaining} more',
    categoryName: '',
    defaultIsOpen: false,
    numLabels: 3,
    isClosable: false,
    isCompact: false,
    onClick: (_e) => undefined,
    closeBtnAriaLabel: 'Close label group',
    tooltipPosition: 'top',
    'aria-label': 'Label group category',
    isVertical: false,
    isEditable: false,
    hasEditableTextArea: false
};
//# sourceMappingURL=LabelGroup.js.map