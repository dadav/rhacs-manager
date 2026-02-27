"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SimpleList = exports.SimpleListContext = void 0;
const tslib_1 = require("tslib");
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const react_styles_1 = require("@patternfly/react-styles");
const simple_list_1 = tslib_1.__importDefault(require("@patternfly/react-styles/css/components/SimpleList/simple-list"));
const SimpleListGroup_1 = require("./SimpleListGroup");
exports.SimpleListContext = (0, react_1.createContext)({});
class SimpleList extends react_1.Component {
    constructor() {
        super(...arguments);
        this.state = {
            currentRef: null
        };
        this.handleCurrentUpdate = (newCurrentRef, itemProps) => {
            this.setState({ currentRef: newCurrentRef });
            const { onSelect } = this.props;
            onSelect && onSelect(newCurrentRef, itemProps);
        };
    }
    render() {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const _a = this.props, { children, className, onSelect, isControlled, 'aria-label': ariaLabel } = _a, props = tslib_1.__rest(_a, ["children", "className", "onSelect", "isControlled", 'aria-label']);
        let isGrouped = false;
        if (children) {
            isGrouped = react_1.Children.toArray(children)[0].type === SimpleListGroup_1.SimpleListGroup;
        }
        return ((0, jsx_runtime_1.jsx)(exports.SimpleListContext.Provider, { value: {
                currentRef: this.state.currentRef,
                updateCurrentRef: this.handleCurrentUpdate,
                isControlled
            }, children: (0, jsx_runtime_1.jsxs)("div", Object.assign({ className: (0, react_styles_1.css)(simple_list_1.default.simpleList, className) }, props, { children: [isGrouped && children, !isGrouped && ((0, jsx_runtime_1.jsx)("ul", { className: (0, react_styles_1.css)('pf-v6-c-simple-list__list'), role: "list", "aria-label": ariaLabel, children: children }))] })) }));
    }
}
exports.SimpleList = SimpleList;
SimpleList.displayName = 'SimpleList';
SimpleList.defaultProps = {
    children: null,
    className: '',
    isControlled: true
};
//# sourceMappingURL=SimpleList.js.map