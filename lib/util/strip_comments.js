function stripComments(stringIN) {
	var SLASH = '/';
	var BACK_SLASH = '\\';
	var STAR = '*';
	var DOUBLE_QUOTE = '"';
	var SINGLE_QUOTE = "'";
	var NEW_LINE = '\n';
	var CARRIAGE_RETURN = '\r';
	
	var string = stringIN;
	var length = string.length;
	var position = 0;
	var output = [];
	
	function getCurrentCharacter () {
		return string.charAt(position);
	}
 
	function getPreviousCharacter () {
		return string.charAt(position - 1);
	}
 
	function getNextCharacter () {
		return string.charAt(position + 1);
	}
 
	function add () {
		output.push(getCurrentCharacter());
	}
 
	function next () {
		position++;
	}
 
	function atEnd () {
		return position >= length;
	}
 
	function isEscaping () {
		if (getPreviousCharacter() == BACK_SLASH) {
			var caret = position - 1;
			var escaped = true;
			while (caret-- > 0) {
				if (string.charAt(caret) != BACK_SLASH) {
					return escaped;
				}
				escaped = !escaped;
			}
			return escaped;
		}
		return false;
	}
 
	function processSingleQuotedString () {
		if (getCurrentCharacter() == SINGLE_QUOTE) {
			add();
			next();
			while (!atEnd()) {
				if (getCurrentCharacter() == SINGLE_QUOTE && !isEscaping()) {
					return;
				}
				add();
				next();
			}
		}
	}
 
	function processDoubleQuotedString () {
		if (getCurrentCharacter() == DOUBLE_QUOTE) {
			add();
			next();
			while (!atEnd()) {
				if (getCurrentCharacter() == DOUBLE_QUOTE && !isEscaping()) {
					return;
				}
				add();
				next();
			}
		}
	}
 
	function processSingleLineComment () {
		if (getCurrentCharacter() == SLASH) {
			if (getNextCharacter() == SLASH) {
				next();
				while (!atEnd()) {
					next();
					if (getCurrentCharacter() == NEW_LINE || getCurrentCharacter() == CARRIAGE_RETURN) {
						return;
					}
				}
			}
		}
	}
 
	function processMultiLineComment () {
		if (getCurrentCharacter() == SLASH) {
			if (getNextCharacter() == STAR) {
				next();
				next();
				while (!atEnd()) {
					next();
					if (getCurrentCharacter() == STAR) {
						if (getNextCharacter() == SLASH) {
							next();
							next();
							return;
						}
					}
				}
			}
		}
	}
	
	function processRegularExpression (){
		if (getCurrentCharacter() == SLASH) {
			add();
			next();
			while (!atEnd()) {
				if (getCurrentCharacter() == SLASH && !isEscaping()) {
					return;
				}
				add();
				next();
			}
		}
	}
 
	while (!atEnd()) {
		processDoubleQuotedString();
		processSingleQuotedString();
		processSingleLineComment();
		processMultiLineComment();
		processRegularExpression();
		if (!atEnd()) {
			add();
			next();
		}
	}
	return output.join('');
 
}

exports.stripComments