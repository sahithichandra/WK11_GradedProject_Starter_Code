import { Button } from 'react-bootstrap';
import { FaBookmark, FaRegBookmark } from 'react-icons/fa';
import { useSelector, useDispatch } from 'react-redux';
import { toggleBookmark } from '../../reducers/bookmarkSlice';
import './BookmarkButton.css';

/**
 * Shared bookmark toggle, used by QuestionCard (feed) and QuestionContent (detail).
 * Outline icon = not saved, filled icon = saved. Handles the auth guard internally,
 * consistent with VoteButtons.
 */
const BookmarkButton = ({ question, className = '' }) => {
  const dispatch = useDispatch();
  const { userInfo } = useSelector((state) => state.user);
  const ids = useSelector((state) => state.bookmark?.ids) || [];

  const isSaved = ids.includes(question?._id);

  const handleClick = (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!userInfo) {
      alert('You must be logged in to save a question.');
      return;
    }

    dispatch(toggleBookmark({ question }));
  };

  return (
    <Button
      variant="link"
      onClick={handleClick}
      className={`p-0 text-decoration-none bookmark-btn ${className}`}
      aria-label={isSaved ? 'Remove bookmark' : 'Save question'}
      aria-pressed={isSaved}
      title={isSaved ? 'Remove bookmark' : 'Save question'}
    >
      {isSaved ? (
        <FaBookmark className="bookmark-icon bookmark-icon-saved" />
      ) : (
        <FaRegBookmark className="bookmark-icon" />
      )}
    </Button>
  );
};

export default BookmarkButton;
