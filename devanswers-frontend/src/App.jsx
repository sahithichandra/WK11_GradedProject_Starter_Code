import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { BrowserRouter as Router, Routes, Route, Outlet } from 'react-router-dom';

import { fetchBookmarks } from './reducers/bookmarkSlice.js';
import Home from './pages/Question/Home.jsx';
import QuestionDetail from './pages/Question/QuestionDetail.jsx';
import PostQuestion from './pages/Question/PostQuestion.jsx';
import Login from './pages/Auth/Login.jsx';
import Register from './pages/Auth/Register.jsx';
import Profile from './pages/Profile/Profile.jsx';
import Tags from './pages/Tags/Tags.jsx';
import BaseLayout from './layouts/BaseLayout.jsx';
import SideBarLayout from './layouts/SideBarLayout.jsx';

function App() {
  const dispatch = useDispatch();
  const { userInfo } = useSelector((state) => state.user);

  // On app load (or after login) with a valid session, hydrate the user's
  // saved-question set so bookmark icons render in the correct state.
  useEffect(() => {
    if (userInfo) {
      dispatch(fetchBookmarks());
    }
  }, [userInfo?.userId, dispatch]);

  return (
    <Router>
        <BaseLayout>
          <Routes>
            <Route element={<SideBarLayout><Outlet /></SideBarLayout>}>
              <Route path='/' element={<Home />} />
              <Route path='/question/:id' element={<QuestionDetail />} />
              <Route path='/ask' element={<PostQuestion />} />
              <Route path='/tags' element={<Tags />} />
              <Route path='/profile' element={<Profile />} />
            </Route>
            <Route path='/login' element={<Login />}/>
            <Route path='/register' element={<Register />}/>
          </Routes>
        </BaseLayout>
    </Router>
  )
}

export default App