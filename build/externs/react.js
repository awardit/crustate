/**
 * @fileoverview Minimal used React externs
 * @externs
 */

/**
 * @suppress {duplicate, const}
 */
var React = {};

/**
 * @param  {*} defaultValue
 * @return {!React.Context}
 */
React.createContext = function(defaultValue) {};

/**
 * @typedef {
 *   boolean|number|string|React.Component|
 *   Array.<boolean>|Array.<number>|Array.<string>|Array.<React.Component>
 * }
 */
React.ChildrenArgument;

/**
 * @param {*} componentClass
 * @param {Object=} props
 * @param {...React.ChildrenArgument} children
 * @return {React.Component}
 */
React.createElement = function(componentClass, props, children) {};

/**
 * @interface
 */
React.Context = function() {}

React.Context.prototype.Provider = function() {};
React.Context.prototype.Consumer = function() {};

/**
 * @constructor
 */
React.Component = function(props, context) {};

React.Component.prototype.componentWillReceiveProps = function(nextProps, nextContext) {};
React.Component.prototype.componentDidMount = function() {};
React.Component.prototype.componentWillUnmount = function() {};
React.Component.prototype.setState = function(data) {};
React.Component.prototype.forceUpdate = function() {};
React.Component.prototype.render = function() {};
/**
 * @type {!string}
 */
React.Component.prototype.displayName;
/**
 * @type {!React.Context}
 */
React.Component.prototype.contextType;
React.Component.prototype.defaultProps;
/**
 * @type {!Object}
 */
React.Component.prototype.state;
React.Component.prototype.props;
React.Component.prototype.props.children;
React.Component.prototype.context;

/**
 * @param {!React.Context} context
 */
React.useContext = function(context) {};

