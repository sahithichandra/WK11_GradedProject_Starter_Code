import { useState } from 'react';
import { Card, Row, Col, Badge, Form, Button } from 'react-bootstrap';
import { useDispatch, useSelector } from 'react-redux';
import { FaUser, FaClock, FaEdit } from 'react-icons/fa';
import { voteQuestion, updateQuestion } from '../../reducers/questionSlice';
import { formatDate } from '../../utils/timeFormat';
import VoteButtons from '../Shared/VoteButtons';
import BookmarkButton from '../Shared/BookmarkButton';
import './QuestionContent.css';

const QuestionContent = ({ question }) => {
  const dispatch = useDispatch();
  const { userInfo } = useSelector((state) => state.user);
  const isAuthor =
    !!question.author?._id && question.author._id === userInfo?.userId;

  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(question.title || '');
  const [description, setDescription] = useState(question.description || '');
  const [tags, setTags] = useState(
    (question.tags || []).map((t) => t.name).join(', '),
  );

  const startEdit = () => {
    setTitle(question.title || '');
    setDescription(question.description || '');
    setTags((question.tags || []).map((t) => t.name).join(', '));
    setIsEditing(true);
  };

  const handleSave = async () => {
    if (!title.trim() || !description.trim()) {
      alert('Title and description cannot be empty.');
      return;
    }
    try {
      await dispatch(
        updateQuestion({ questionId: question._id, title, description, tags }),
      ).unwrap();
      setIsEditing(false);
    } catch (error) {
      alert(`Failed to update question: ${error}`);
    }
  };

  return (
    <>
      {/* Question Header */}
      <Card className="mb-4 qcontent-header-card">
        <Card.Body className="p-3 p-sm-4">
          <div className="d-flex justify-content-between align-items-start gap-2">
            {isEditing ? (
              <Form.Control
                className="mb-3 flex-grow-1 qcontent-edit-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                aria-label="Edit title"
              />
            ) : (
              <Card.Title as="h2" className="mb-3 qcontent-title flex-grow-1">
                {question.title}
              </Card.Title>
            )}
            <div className="d-flex align-items-center gap-2">
              {isAuthor && !isEditing && (
                <Button
                  variant="link"
                  className="p-0 text-decoration-none qcontent-edit-btn"
                  onClick={startEdit}
                  aria-label="Edit question"
                  title="Edit question"
                >
                  <FaEdit />
                </Button>
              )}
              <BookmarkButton question={question} />
            </div>
          </div>
          <div className="d-flex flex-wrap gap-3 gap-sm-4 qcontent-meta">
            <span className="d-flex align-items-center gap-2">
              <FaClock />
              Asked {formatDate(question.createdAt)}
              {question.isEdited && (
                <span className="text-muted fst-italic small ms-1">(edited)</span>
              )}
            </span>
          </div>
        </Card.Body>
      </Card>

      {/* Question Content */}
      <Card className="mb-4 qcontent-body-card">
        <Card.Body className="p-3 p-sm-4">
          <Row>
            {/* Voting Controls */}
            <Col xs="auto" className="d-flex flex-column align-items-center pe-3 pe-sm-4">
              <VoteButtons
                voteCount={question.voteCount}
                authorId={question.author?._id}
                onVote={(voteType) => dispatch(voteQuestion({ question, voteType }))}
                variant="outline-secondary"
                upClassName="mb-2 qcontent-vote-btn"
                downClassName="mt-2 qcontent-vote-btn"
                countClassName="qcontent-vote-count"
                upIconClassName="qcontent-icon-up"
                downIconClassName="qcontent-icon-down"
                itemType="question"
              />
            </Col>

            {/* Main Content */}
            <Col>
              {isEditing ? (
                <>
                  <Form.Group className="mb-3">
                    <Form.Label>Description</Form.Label>
                    <Form.Control
                      as="textarea"
                      rows={6}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      aria-label="Edit description"
                    />
                  </Form.Group>
                  <Form.Group className="mb-3">
                    <Form.Label>Tags (comma separated)</Form.Label>
                    <Form.Control
                      value={tags}
                      onChange={(e) => setTags(e.target.value)}
                      aria-label="Edit tags"
                    />
                  </Form.Group>
                  <div className="d-flex gap-2">
                    <Button variant="primary" onClick={handleSave}>
                      Save
                    </Button>
                    <Button
                      variant="outline-secondary"
                      onClick={() => setIsEditing(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <div className="mb-4 qcontent-description">
                    {question.description}
                  </div>

                  <div className="mb-4">
                    {question.tags?.map((tag) => (
                      <Badge
                        key={tag._id}
                        className="me-2 mb-2 qcontent-tag-badge"
                      >
                        {tag.name}
                      </Badge>
                    ))}
                  </div>

                  <div className="d-flex align-items-center gap-2 qcontent-author-row">
                    <FaUser className="qcontent-icon-sm" />
                    <span>Posted by </span>
                    <strong className="qcontent-author-name">
                      {question.author?.name}
                    </strong>
                  </div>
                </>
              )}
            </Col>
          </Row>
        </Card.Body>
      </Card>
    </>
  );
};

export default QuestionContent;
